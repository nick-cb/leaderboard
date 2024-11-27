const { describe, it } = require("node:test");
const assert = require("node:assert");
const { MineSweeper } = require("..");
const { seed40 } = require("../seed.js");

describe("minesweeper test", () => {
  it("should calculate the correct 3bv", () => {
    const minesweeper = new MineSweeper(8, 8, 10);
    minesweeper.initMineSweeperFromArray([
      [0, 0, 0, 0, 0, 1, 3, 9],
      [0, 0, 0, 0, 1, 3, 9, 9],
      [0, 0, 1, 2, 3, 9, 9, 3],
      [0, 0, 1, 9, 9, 3, 2, 1],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 0, 1, 1, 2, 1, 1, 0],
      [0, 0, 1, 9, 2, 9, 2, 1],
      [0, 0, 1, 1, 2, 1, 2, 9],
    ]);
    minesweeper.printBoard();
    assert.equal(minesweeper.calculate3bv(), 13);
  });
});
