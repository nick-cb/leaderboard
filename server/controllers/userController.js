const db = require("../db/db");

async function login({ username, password }) {
  const [userRow, _] = await db
    .select(["ID"])
    .from("users")
    .where(and(eq("username", username), eq("password", password)));

  const user = userRow[0];
  if (!user) {
    throw new Error("Invalid user");
  }

  return { userId: user.ID };
}

module.exports = { login };
