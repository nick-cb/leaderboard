const { describe, it } = require("node:test");
const assert = require("assert");
const { eq, and, or, from, where, orderBy } = require("../db/db.js");

describe("sql helper functions test", () => {
  it("should work with eq", () => {
    assert.deepEqual(eq("key", "value"), ["key=?", "value"]);
  });

  it("should work with and", () => {
    assert.deepEqual(and(eq("key", "value"), eq("key2", "value2")), [
      "key=? and key2=?",
      ["value", "value2"],
    ]);
  });

  it("should work with or", () => {
    assert.deepEqual(or(eq("key", "value")), ["key=?", ["value"]]);

    assert.deepEqual(or(eq("key", "value"), eq("key2", "value2")), [
      "key=? or key2=?",
      ["value", "value2"],
    ]);
  });
});

describe("sql select statement test", () => {
  it("should work with from", () => {
    assert.equal(from("table"), "from table");
  });

  it("should work with where", () => {
    assert.deepEqual(where(eq("key", "value")), [`where key=?`, "value"]);

    assert.deepEqual(where(and(eq("key", "value"), eq("key2", "value2"))), [
      `where key=? and key2=?`,
      ["value", "value2"],
    ]);

    assert.deepEqual(where(or(eq("key", "value"), eq("key2", "value2"))), [
      `where key=? or key2=?`,
      ["value", "value2"],
    ]);
  });

  it("should work with order by", () => {
    assert.equal(orderBy({ x: 1, y: 0 }), `order by x ASC,y DESC`);
  });
});
