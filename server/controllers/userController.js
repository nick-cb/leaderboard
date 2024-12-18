const db = require("../db/db");
const { and, eq } = require("../../query-builder/index.js");

async function login({ username, password }) {
  const [userRow, _] = await db
    .select(["ID"])
    .from("users")
    .where(and(eq("user_name", username), eq("password", password)));

  const user = userRow[0];
  if (!user) {
    throw new Error("Invalid user");
  }

  return { userId: user.ID };
}

module.exports = { login };
