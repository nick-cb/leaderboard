const { describe, it } = require("node:test");
const assert = require("node:assert");
const { MineSweeper, Tile } = require("../index.js");
const { seed40 } = require("../seed.js");

describe("minesweeper test", () => {
  it("should initiate the instance with normal construct", () => {
    const minesweeper = new MineSweeper(8, 8, 10);
    assert.equal(minesweeper.rows, 8);
    assert.equal(minesweeper.cols, 8);
    assert.equal(minesweeper.mines, 10);

    const board = minesweeper.getBoardAs2DArray();
    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);
    assert.equal(
      board.flatMap((row) => row).filter((item) => item === 9).length,
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

    const board = minesweeper.getBoardAs2DArray();
    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);
    assert.equal(
      board.flatMap((row) => row).filter((item) => item === 9).length,
      10,
    );
  });

  it("should initiate the instance with the from function using 1 dimension array of number", () => {
    const minesweeper = MineSweeper.from({
      rows: 8,
      cols: 8,
      tiles: [
        0, 0, 0, 0, 0, 1, 3, 9, 0, 0, 0, 0, 1, 3, 9, 9, 0, 0, 1, 2, 3, 9, 9, 3,
        0, 0, 1, 9, 9, 3, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 1, 1, 2, 1, 1, 0,
        0, 0, 1, 9, 2, 9, 2, 1, 0, 0, 1, 1, 2, 1, 2, 9,
      ],
    });
    assert.equal(minesweeper.rows, 8);
    assert.equal(minesweeper.cols, 8);
    assert.equal(minesweeper.mines, 10);

    const board = minesweeper.getBoardAs2DArray();
    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);
    assert.equal(
      board.flatMap((row) => row).filter((item) => item === 9).length,
      10,
    );
  });

  it("should initiate the instance with the from function using 1 dimension array of board cell", () => {
    const numbers = [
      0, 0, 0, 0, 0, 1, 3, 9, 0, 0, 0, 0, 1, 3, 9, 9, 0, 0, 1, 2, 3, 9, 9, 3, 0,
      0, 1, 9, 9, 3, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0,
      1, 9, 2, 9, 2, 1, 0, 0, 1, 1, 2, 1, 2, 9,
    ];
    const rows = 8;
    const cols = 8;
    const tiles = numbers.map((n, i) => {
      const y = Math.floor(i / rows);
      const x = i % cols;
      return new Tile({ x, y, constant: n, constrains: [rows, cols] });
    });
    const minesweeper = MineSweeper.from({
      rows,
      cols,
      tiles,
    });
    assert.equal(minesweeper.rows, 8);
    assert.equal(minesweeper.cols, 8);
    assert.equal(minesweeper.mines, 10);
    let board = minesweeper.getBoardAs2DArray();
    assert.equal(board[0][0], 0);
    // assert.equal(board[0][1], "-");

    board = minesweeper.getBoardAs2DArray();
    assert.equal(board.length, 8);
    assert.equal(board[0].length, 8);
    assert.equal(
      board.flatMap((row) => row).filter((item) => item === 9).length,
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

    assert.equal(minesweeper.calculate3bv(), 13);
  });

  it("should start game", () => {
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

    minesweeper.revealTile({ x: 0, y: 0 });

    assert.equal(minesweeper.result, undefined);
    assert.equal(minesweeper.isFinished(), false);
  });

  it("should end game when reveal mine", () => {
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

    assert.equal(minesweeper.result, undefined);
    assert.equal(minesweeper.isFinished(), false);

    minesweeper.revealTile({ x: 7, y: 0 });

    assert.equal(minesweeper.result, 0);
    assert.equal(minesweeper.isFinished(), true);
  });

  it("should end game when exceed time", () => {
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

    assert.equal(minesweeper.result, undefined);
    assert.equal(minesweeper.isFinished(), false);

    minesweeper.revealTile({ x: 7, y: 0 });

    minesweeper.endTime = minesweeper.startGame + 999 * 1000;
    minesweeper.updateGameState();
    assert.equal(minesweeper.result, 0);
    assert.equal(minesweeper.isFinished(), true);
  });
});
