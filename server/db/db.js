const mysql = require("mysql2/promise.js");

/** @type {mysql.Connection} connection */
let connection;
(async () => {
  try {
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

process.on("beforeExit", () => {
  connection.destroy();
});

module.exports = { connection, sql };
