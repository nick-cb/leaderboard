const { describe, it } = require("node:test");
const assert = require("node:assert");
const { Scheduler } = require("../scheduler");

describe("Scheduler", () => {
  it("should emit an event on matched time", (_, done) => {
    const start = new Date();
    const scheduler = new Scheduler("* * * * * *");
    scheduler.on("scheduled-time-matched", ({ date }) => {
      assert.notEqual(null, date);
      assert.equal(true, date instanceof Date);
      const diff = Math.floor((date - start) / 1000);
      if (diff > 1) {
        scheduler.stop();
        assert.equal(2, diff);
        done();
      }
    });
    scheduler.start();
  });
});
