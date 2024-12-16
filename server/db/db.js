const mysql = require("mysql2/promise.js");
const { setupDatabase } = require("../../query-builder");

async function connectDb() {
  try {
    const connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/minesweeper",
    );
    process.on("disconnect", () => {
      console.log("disconnected to database!\n\n");
      connection.destroy();
    });
    console.log("connected to database!\n\n");
    return connection;
  } catch (error) {
    console.log(error);
  }
}

let promise;
if (!promise) {
  promise = connectDb();
}

module.exports = setupDatabase(promise);
