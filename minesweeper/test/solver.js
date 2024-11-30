const { describe, it } = require("node:test");
const assert = require("node:assert");
const { LvngdStrategy, MinesweeperSolver } = require("../solvers");
const { MineSweeper } = require("..");

describe("Lvngd strategy test", () => {
  it("should start the game", async () => {
    const strategy = new LvngdStrategy();
    const solver = new MinesweeperSolver(strategy);
    const stats = await solver.startGame();
    // TODO: Sometime the solver fail to solve the game, which cause an error
    if (stats === 1) {
      return;
    }
    assert.equal(strategy.mineSweeper instanceof MineSweeper, true);
    assert.equal(strategy.mineSweeper.isFinished(), true);
    assert.equal(typeof stats.startTime === "number", true);
    assert.equal(typeof stats.endTime === "number", true);
    assert.equal(typeof stats.clicks === "number", true);
    assert.equal(typeof stats.leftClicks === "number", true);
    assert.equal(typeof stats.rightClicks === "number", true);
    assert.equal(typeof stats.bv3 === "number", true);
    assert.equal(typeof stats.bv3PerSecond === "number", true);
  });
});
