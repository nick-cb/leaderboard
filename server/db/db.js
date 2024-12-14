const mysql = require("mysql2/promise.js");

/** @type {mysql.Connection} connection */
let connection;
(async () => {
  try {
    console.log("7", { connection });
    if (connection) {
      return;
    }
    connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/minesweeper",
    );
    await connection.ping();
    console.log("connected to database!\n\n");
  } catch (error) {
    console.log(error);
  }
})();

function from(params) {
  return [`from ${params}`];
}

function where(params) {
  if (Array.isArray(params)) {
    return [
      `where ${params[0]}`,
      Array.isArray(params[1]) ? params[1] : [params[1]],
    ];
  }
  if ("toSqlString" in params) {
    return [`where ${params.toSqlString()}`];
  }
  throw new Error("Invalid statement");
}

function orderBy(params) {
  return [
    `order by ${Object.entries(params)
      .map(([key, value]) => {
        return `${key} ${value === 1 ? "ASC" : "DESC"}`;
      })
      .join(",")}`,
  ];
}

function set(params) {
  const sql = `set ${Object.keys(params)
    .map((key) => `${key}=?`)
    .join(",")}`;
  const values = Object.values(params).map((val) => {
    if ("toSqlString" in val) {
      return val.toSqlString();
    }
    return val;
  });

  return [sql, values];
}

function and(...params) {
  const statement = params.map((p) => p[0]).join(" and ");
  const values = params.flatMap((p) => p[1]);
  return [statement, values];
}

function or(...params) {
  const statement = params.map((p) => p[0]).join(" or ");
  const values = params.flatMap((p) => p[1]);
  return [statement, values];
}

function eq(key, value) {
  return [`${key}=?`, value];
}

/** @param {Array<string>} fields */
function select(fields) {
  let resolveFn;
  let rejectFn;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  let sql = [`select ${fields.join(",")}`];
  let values = [];

  return {
    from(table) {
      sql.push(from(table));
      promise.where = (params) => {
        const w = where(params);
        sql.push(w[0]);
        values.push(...w[1]);
        return promise;
      };
      promise.orderBy = (params) => {
        const order = orderBy(params);
        sql.push(order[0]);
        return promise;
      };

      process.nextTick(async () => {
        try {
          console.log(sql.join(" "), { values });
          const result = await connection.execute(sql.join(" "), values);
          resolveFn(result);
        } catch (error) {
          rejectFn(error);
        }
      });
      return promise;
    },
  };
}

/** @param {string} table */
function insert(table) {
  return {
    values(data) {
      let columns;
      let valuePlaceholder;
      let values;
      if (Array.isArray(data)) {
        columns = Object.keys(data[0]);
        valuePlaceholder = data
          .map(() => columns.map(() => "?").join(","))
          .join("),(");
        values = data.flatMap((row) => Object.values(row));
      } else {
        columns = Object.keys(data);
        values = Object.values(data);
        valuePlaceholder = values.map(() => "?").join(",");
      }
      return connection.execute(
        `insert into ${table} (${columns.join(",")}) values (${valuePlaceholder})`,
        values,
      );
    },
  };
}

function update(table) {
  let resolveFn;
  let rejectFn;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  let sql = [`update ${table}`];
  let values = [];

  promise.set = (params) => {
    const s = set(params);
    sql.push(s[0]);
    values.push(...s[1]);
    return promise;
  };
  promise.where = (params) => {
    sql.push(where(params));
    return promise;
  };

  process.nextTick(async () => {
    try {
      const result = await connection.execute(sql.join(" "), values);
      resolveFn(result);
    } catch (error) {
      rejectFn(error);
    }
  });
  return promise;
}

const sql = mysql.raw;

module.exports = {
  connection,
  select,
  insert,
  update,
  sql,
  from,
  where,
  orderBy,
  set,
  and,
  or,
  eq,
};
