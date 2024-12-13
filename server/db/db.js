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

/** @param {Array<string>} fields */
function select(fields) {
  let resolveFn;
  let rejectFn;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  let columns;
  if (Array.isArray(fields)) {
    columns = fields.join(",");
  } else {
    columns = Object.keys(fields).join(",");
  }
  let sqlStatement = [`select ${columns}`];
  function updateQuery(operation, params) {
    if (operation === "from") {
      sqlStatement.push(`from ${params.table}`);
      return;
    }
    if (operation === "where") {
      if ("toSqlString" in params) {
        sqlStatement.push(`where ${params.toSqlString()}`);
      }
      return;
    }
    if (operation === "order") {
      sqlStatement.push(
        `order by ${Object.entries(params)
          .map(([key, value]) => {
            return `${key} ${value === 1 ? "ASC" : "DESC"}`;
          })
          .join(",")}`,
      );
      return;
    }
  }

  return {
    from(table) {
      updateQuery("from", { table });
      promise.where = function (params) {
        updateQuery("where", params);
        return promise;
      };
      promise.order = function (params) {
        updateQuery("order", params);
        return promise;
      };

      process.nextTick(() => {
        console.log(sqlStatement.join(" "));
        resolveFn(connection.query(sqlStatement.join(" ")));
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

  let sqlStatement = [`update ${table}`];
  function updateQuery(operation, params) {
    if (operation === "set") {
      sqlStatement.push(
        `set ${Object.entries(params)
          .map(([key, value]) => {
            return `${key}=${value}`;
          })
          .join(",")}`,
      );
      return;
    }
    if (operation === "where") {
      if ("toSqlString" in params) {
        sqlStatement.push(`where ${params.toSqlString()}`);
      }
      return;
    }
  }

  promise.set = (params) => {
    updateQuery("set", params);
    return promise;
  };
  promise.where = (params) => {
    updateQuery("where", params);
    return promise;
  };

  process.nextTick(() => {
    console.log(sqlStatement.join(" "));
    connection.query(sqlStatement.join(" "));
  });
  return promise;
}

const sql = mysql.raw;

module.exports = { connection, select, insert, update, sql };
