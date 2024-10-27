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
 * @property {Array<BoardCell>} neighbors
 */

class MineSweeper {
  rows;
  cols;
  mines;
  /** @type {Array<Array<BoardCell>>} board */
  board;
  seeds;

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
    this.board = new Array(this.rows);
    for (let i = 0; i < this.rows; i++) {
      this.board[i] = new Array(this.cols);
      for (let j = 0; j < this.cols; j++) {
        this.board[i][j] = {
          coordinate: { x: j, y: i },
          adjMine: 0,
          isReveal: false,
          isMine: false,
          neighbors: [],
        };
      }
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
        x = Math.round(
          (this.seeds ? sfc32(...this.seeds[i].x)() : Math.random()) *
            (this.rows - 1),
        );
        y = Math.round(
          (this.seeds ? sfc32(...this.seeds[i].y)() : Math.random()) *
            (this.cols - 1),
        );
      } while (
        this.board.find((p) => p?.coordinate?.x === x && p?.coordinate?.y === y)
      );
      this.board[x][y].coordinate = { x, y };
      this.board[x][y].isMine = true;
      this.board[x][y].adjMine = 0;
    }
  }

  #fillBoardWithMineAdjacentNumbers() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.board[row][col];
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
          if (!this.board[y] || !this.board[y][x]) {
            continue;
          }
          if (this.board[y][x].isMine) {
            tile.adjMine += 1;
          }
          tile.neighbors.push(this.board[y][x]);
        }
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

    return 0;
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

  getTile({ x, y }) {
    return this.board[y][x];
  }
}
exports.MineSweeper = MineSweeper;

// const mineSweeper = new MineSweeper(9, 9, 10);
// mineSweeper.initMinSweeper();
// mineSweeper.printBoard();
// mineSweeper.printMaskedBoard();

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// function askQuestion() {
//   rl.question("Select a cell to open: ", (answer) => {
//     const [x, y] = answer.split(" ");
//     const result = mineSweeper.revealTile({ x: +x, y: +y });
//     if (result === 1) {
//       mineSweeper.printYouLost();
//       mineSweeper.revealAll();
//       mineSweeper.printMaskedBoard();
//       process.exit();
//     }
//     mineSweeper.printMaskedBoard();
//     askQuestion();
//   });
// }

// askQuestion();
