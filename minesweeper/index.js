const util = require("util");
const readline = require("node:readline");
const process = require("node:process");
const { sfc32 } = require("./utils");
/**
 * @typedef {Object} BoardCell
 * @property {{x: number, y: number}} coordinate
 * @property {boolean} isMine
 * @property {number} adjMine
 * @property {boolean} isReveal
 * @property {Array<{x: number, y: number}>} neighbors
 */

class MineSweeper {
  rows;
  cols;
  mines;
  /** @type {Array<Array<BoardCell>>} board */
  #board;
  /** @type {Array<Array<BoardCell>>} board */
  maskedBoard;
  seeds;
  mineList = [];
  #revealedCount = 0;

  /** Create a MineSweeper object
   * @param {number} rows
   * @param {number} cols
   * @param {number} mines
   * @param {unknown} mask
   * @param {unknown} board
   * @param {unknown} seeds
   */
  constructor(rows, cols, mines, seeds) {
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.seeds = seeds;
  }

  #initBoard() {
    this.#board = new Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      this.#board[i] = new Array(this.cols);
      for (let j = 0; j < this.cols; j++) {
        this.#board[i][j] = {
          coordinate: { x: j, y: i },
          adjMine: 0,
          isReveal: false,
          isMine: false,
          neighbors: [],
        };
      }
    }
  }

  #initMaskedBoard() {
    this.maskedBoard = new Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      this.maskedBoard[i] = new Array(this.cols);
      for (let j = 0; j < this.cols; j++) {
        this.maskedBoard[i][j] = {
          coordinate: { x: j, y: i },
          neighbors: this.#board[i][j].neighbors,
          adjMine: 0,
          isReveal: false,
        };
      }
    }
  }

  initMinSweeper() {
    this.#initBoard();
    this.#putMineOnBoard();
    this.#fillBoardWithMineAdjacentNumbers();
    this.#initMaskedBoard();
  }

  #putMineOnBoard() {
    for (let i = 0; i < this.mines; i++) {
      let x;
      let y;
      do {
        x = Math.round(
          (this.seeds ? sfc32(...this.seeds[i].x)() : Math.random()) *
            (this.rows - 1),
        );
        y = Math.round(
          (this.seeds ? sfc32(...this.seeds[i].y)() : Math.random()) *
            (this.cols - 1),
        );
      } while (
        this.#board.find(
          (p) => p?.coordinate?.x === x && p?.coordinate?.y === y,
        )
      );
      this.#board[y][x].coordinate = { x, y };
      this.#board[y][x].isMine = true;
      this.#board[y][x].adjMine = 0;
      this.mineList.push(this.#board[y][x]);
    }
  }

  #fillBoardWithMineAdjacentNumbers() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.#board[row][col];
        const neighbors = [
          { y: row - 1, x: col - 1 },
          { y: row - 1, x: col },
          { y: row - 1, x: col + 1 },
          { y: row, x: col - 1 },
          { y: row, x: col + 1 },
          { y: row + 1, x: col - 1 },
          { y: row + 1, x: col },
          { y: row + 1, x: col + 1 },
        ];
        for (const { y, x } of neighbors) {
          if (!this.#board[y] || !this.#board[y][x]) {
            continue;
          }
          if (this.#board[y][x].isMine) {
            tile.adjMine += 1;
          }
          tile.neighbors.push({ x, y });
        }
      }
    }
  }

  /** @param {MaskCell} cell */
  revealAdjacentTile({ coordinate: { x, y } }, callback) {
    this.revealTile({ y: y - 1, x: x - 1 }, callback);
    this.revealTile({ y: y - 1, x: x }, callback);
    this.revealTile({ y: y - 1, x: x + 1 }, callback);
    this.revealTile({ y: y, x: x - 1 }, callback);
    this.revealTile({ y: y, x: x + 1 }, callback);
    this.revealTile({ y: y + 1, x: x - 1 }, callback);
    this.revealTile({ y: y + 1, x: x }, callback);
    this.revealTile({ y: y + 1, x: x + 1 }, callback);
  }

  /** @param {BoardCell} cell */
  #revealMaskedTile(cell) {
    const maskedCell = this.maskedBoard[cell.coordinate.y][cell.coordinate.x];
    if (maskedCell.isReveal) {
      return;
    }
    maskedCell.adjMine = cell.adjMine;
    maskedCell.neighbors = cell.neighbors;
    maskedCell.isReveal = cell.isReveal;
    maskedCell.isMine = cell.isMine;
  }

  /**
   * @param {{x: number, y: number}} tile
   * @param {(cell: BoardCell) => void} callback
   */
  revealTile({ x, y }, callback) {
    const cell = this.#board[y]?.[x];
    if (!cell || cell.isReveal) {
      return 0;
    }
    if (cell.isMine) {
      return 1;
    }

    cell.isReveal = true;
    this.#revealMaskedTile(cell);
    this.#revealedCount += 1;
    callback?.(this.maskedBoard[cell.coordinate.y][cell.coordinate.x]);

    if (cell.adjMine === 0) {
      this.revealAdjacentTile(cell, callback);
    }

    return 0;
  }

  revealAll() {
    for (const cell of this.#board) {
      cell.isReveal = true;
    }
  }

  /** @param {{x: number, y: number}} tile */
  flagMine({ x, y }) {
    if (this.#board[y][x].isReveal) {
      console.log(`Attempt to flag revealed tile (${x} ${y})`);
      return;
    }
    this.#board[y][x].isMine = true;
    this.maskedBoard[y][x].isMine = true;
  }

  resetMinSweeper() {
    this.#initBoard();
  }

  printMaskedBoard() {
    let str = "";
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const tile = this.maskedBoard[i][j];
        const adjMine = Math.max(0, tile.adjMine);
        if (tile.isReveal) {
          if (tile.isMine) {
            str += "💥";
          } else if (adjMine) {
            const colors = {
              1: 34,
              2: 32,
              3: 31,
              4: 36,
              5: 33,
              6: 35,
              7: 91,
              8: 95,
            };
            str += `\x1b[${colors[adjMine]}m${adjMine}\x1b[0m `;
          } else {
            str += "◻ ";
          }
        } else {
          if (tile.isMine) {
            str += `\x1b[31m◼\x1b[0m `;
          } else {
            str += "◼ ";
          }
        }
      }

      str += "\n";
    }
    console.log(str);
  }

  printBoard() {
    let str = "";
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const tile = this.#board[i][j];
        if (tile.isMine) {
          str += "💥";
        } else {
          const colors = {
            0: 37,
            1: 34,
            2: 32,
            3: 31,
            4: 36,
            5: 33,
            6: 35,
            7: 91,
            8: 95,
          };
          str += `\x1b[${colors[tile.adjMine]}m${tile.adjMine}\x1b[0m `;
        }
      }

      str += "\n";
    }

    console.log(str);
  }

  printYouLost() {
    console.log("You Lost");
  }
}

exports.MineSweeper = MineSweeper;
