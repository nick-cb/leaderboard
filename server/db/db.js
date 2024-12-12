const mysql = require("mysql2/promise.js");

/** @type {mysql.Connection} connection */
let connection;
(async () => {
  try {
    console.log('7',{ connection })
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

const sql = mysql.raw;

/** @param {string} table */
function insert(table) {
  return {
    values(data) {
      let columns;
      let values;
      if (Array.isArray(data)) {
        columns = Object.keys(data[0]);
        values = data.map((row) => Object.values(row));
      } else {
        columns = Object.keys(data);
        values = Object.values(data);
      }

      return connection.execute(
        `insert into ${table} (${columns.join(",")}) values (${columns.map(() => "?").join(",")})`,
        values,
        //   sql(`
        //   insert into ${table}(${columns})
        //   values (${values})
        // `).toSqlString(),
      );
    },
  };
}

function convertValue(value) {
  if (typeof value === "string") {
    return "'" + value + "'";
  }
  if (value instanceof Date) {
    return "'" + convertDateToSqlDate(value) + "'";
  }

  return value;
}

function convertDateToSqlDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dom = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, dom].join("-") + " " + [hour, minute, second].join(":");
}

process.on("beforeExit", () => {
  connection.destroy();
});

module.exports = { connection, sql, insert };
