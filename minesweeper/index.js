const util = require("util");
const readline = require("node:readline");
const process = require("node:process");
const { seeds } = require("./seed");
const { sfc32 } = require("./utils");
/**
 * @typedef {Object} BoardCell
 * @property {{x: number, y: number}} coordinate
 * @property {boolean} isMine
 * @property {number} adjMine
 * @property {boolean} isReveal
 */

/**
 * @typedef {Object} MaskCell
 * @property {{x: number, y: number}} coordinate
 * @property {number} cellIdx
 * @property {boolean} isReveal
 */

class MineSweeper {
  rows;
  cols;
  mines;
  /** @type {Array<Array<BoardCell>>} board */
  board;

  /** Create a MineSweeper object
   * @param {number} rows
   * @param {number} cols
   * @param {number} mines
   * @param {unknown} mask
   * @param {unknown} board
   */
  constructor(rows, cols, mines) {
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
  }

  #initBoard() {
    this.board = new Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      this.board[i] = new Array(this.cols);
    }
  }

  initMinSweeper() {
    this.#initBoard();
    this.#putMineOnBoard();
    this.#fillBoardWithMineAdjacentNumbers();
  }

  #putMineOnBoard() {
    for (let i = 0; i < this.mines; i++) {
      let x;
      let y;
      do {
        x = Math.round(sfc32(...seeds[i].x)() * (this.rows - 1));
        y = Math.round(sfc32(...seeds[i].y)() * (this.cols - 1));
      } while (
        this.board.find((p) => p?.coordinate?.x === x && p?.coordinate?.y === y)
      );
      this.board[x][y] = { coordinate: { x, y }, isMine: true, adjMine: 0 };
    }
  }

  #fillBoardWithMineAdjacentNumbers() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.board[row][col] || {
          coordinate: { x: col, y: row },
          adjMine: 0,
          isReveal: false,
          isMine: false,
        };
        if (this.board[row - 1]?.[col - 1]?.isMine) {
          tile.adjMine += 1;
        }
        if (this.board[row - 1]?.[col]?.isMine) {
          tile.adjMine += 1;
        }
        if (this.board[row - 1]?.[col + 1]?.isMine) {
          tile.adjMine += 1;
        }
        if (this.board[row]?.[col - 1]?.isMine) {
          tile.adjMine += 1;
        }
        if (this.board[row]?.[col + 1]?.isMine) {
          tile.adjMine += 1;
        }
        if (this.board[row + 1]?.[col - 1]?.isMine) {
          tile.adjMine += 1;
        }
        if (this.board[row + 1]?.[col]?.isMine) {
          tile.adjMine += 1;
        }
        if (this.board[row + 1]?.[col + 1]?.isMine) {
          tile.adjMine += 1;
        }
        this.board[row][col] = tile;
      }
    }
  }

  /** @param {MaskCell} cell */
  revealAdjacentTile({ coordinate: { x, y } }) {
    this.revealTile({ y: y - 1, x: x - 1 });
    this.revealTile({ y: y - 1, x: x });
    this.revealTile({ y: y - 1, x: x + 1 });
    this.revealTile({ y: y, x: x - 1 });
    this.revealTile({ y: y, x: x + 1 });
    this.revealTile({ y: y + 1, x: x - 1 });
    this.revealTile({ y: y + 1, x: x });
    this.revealTile({ y: y + 1, x: x + 1 });
  }

  /** @param {{x: number, y: number}} tile */
  revealTile({ x, y }) {
    const cell = this.board[y]?.[x];
    if (!cell || cell.isReveal) {
      return 0;
    }
    if (cell.isMine) {
      return 1;
    }

    cell.isReveal = true;

    if (cell.adjMine === 0) {
      this.revealAdjacentTile(cell);
    }
  }

  revealAll() {
    for (const cell of this.board) {
      cell.isReveal = true;
    }
  }

  resetMinSweeper() {
    this.#initBoard();
  }

  printMaskedBoard() {
    let str = "";
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const tile = this.board[i][j];
        if (tile.isReveal) {
          if (tile.isMine) {
            str += "💥";
          } else if (tile.adjMine) {
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
            str += `\x1b[${colors[tile.adjMine]}m${tile.adjMine}\x1b[0m `;
          } else {
            str += "◻ ";
          }
        } else {
          str += "◼ ";
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
        const tile = this.board[i][j];
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

const mineSweeper = new MineSweeper(9, 9, 10);
mineSweeper.initMinSweeper();
mineSweeper.printBoard();
mineSweeper.printMaskedBoard();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion() {
  rl.question("Select a cell to open: ", (answer) => {
    const [x, y] = answer.split(" ");
    const result = mineSweeper.revealTile({ x: +x, y: +y });
    if (result === 1) {
      mineSweeper.printYouLost();
      mineSweeper.revealAll();
      mineSweeper.printMaskedBoard();
      process.exit();
    }
    mineSweeper.printMaskedBoard();
    askQuestion();
  });
}

askQuestion();
