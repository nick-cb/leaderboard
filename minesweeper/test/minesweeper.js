const { describe, it } = require("node:test");
const assert = require("node:assert");
const { MineSweeper } = require("..");
const { seed40 } = require("../seed.js");

describe("minesweeper test", () => {
  it("should initiate the instance with normal construct", () => {
    const minesweeper = new MineSweeper(8, 8, 10);
    assert.equal(minesweeper.rows, 8);
    assert.equal(minesweeper.cols, 8);
    assert.equal(minesweeper.mines, 10);

    minesweeper.revealAll();
    const board = minesweeper.getMaskedBoardAsNumberArray();
    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);
    assert.equal(
      board.flatMap((row) => row.map((col) => col)).filter((item) => item === 9)
        .length,
      10,
    );
  });

  it("should initiate the instance with the from function", () => {
    const minesweeper = MineSweeper.from([
      [0, 0, 0, 0, 0, 1, 3, 9],
      [0, 0, 0, 0, 1, 3, 9, 9],
      [0, 0, 1, 2, 3, 9, 9, 3],
      [0, 0, 1, 9, 9, 3, 2, 1],
      [0, 0, 1, 2, 2, 1, 0, 0],
      [0, 0, 1, 1, 2, 1, 1, 0],
      [0, 0, 1, 9, 2, 9, 2, 1],
      [0, 0, 1, 1, 2, 1, 2, 9],
    ]);
    assert.equal(minesweeper.rows, 8);
    assert.equal(minesweeper.cols, 8);
    assert.equal(minesweeper.mines, 10);

    minesweeper.revealAll();
    const board = minesweeper.getMaskedBoardAsNumberArray();
    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);
    assert.equal(
      board.flatMap((row) => row.map((col) => col)).filter((item) => item === 9)
        .length,
      10,
    );
  });

  it("should calculate the correct 3bv", () => {
    const minesweeper = MineSweeper.from([
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
