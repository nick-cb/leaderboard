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
  /** @type {Array<MaskCell>} board */
  mask;
  /** @type {Array<BoardCell>} board */
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
    this.board = new Array(this.rows * this.cols);
  }

  #initMask() {
    this.mask = new Array(this.rows * this.cols);
    for (let i = 0; i < this.cols * this.rows; i++) {
      const x = i % this.rows;
      const y = Math.floor(i / this.rows);
      const cellIdx = this.board.findIndex(
        ({ coordinate }) => coordinate.x === x && coordinate.y === y,
      );
      this.mask[i] = {
        coordinate: { x, y },
        cellIdx,
      };
    }
  }

  initMinSweeper() {
    this.#initBoard();
    this.#putMineOnBoard();
    this.#fillBoardWithMineAdjacentNumbers();
    this.#initMask();
  }

  #putMineOnBoard() {
    for (let i = 0; i < this.mines; i++) {
      let x;
      let y;
      do {
        x = Math.round(sfc32(...seeds[i].x)() * this.rows);
        y = Math.round(sfc32(...seeds[i].y)() * this.cols);
      } while (
        this.board.find((p) => p?.coordinate?.x === x && p?.coordinate?.y === y)
      );
      this.board[i] = { coordinate: { x, y }, isMine: true };
    }
  }

  #fillBoardWithMineAdjacentNumbers() {
    let lastIdx = this.mines;
    for (let i = 0; i < this.cols * this.rows; i++) {
      let x = i % this.rows;
      let y = Math.floor(i / this.rows);
      let adjMineCount = 0;
      if (
        this.board.find((p) => p?.coordinate?.x === x && p?.coordinate?.y === y)
      ) {
        continue;
      }
      for (let j = 0; j < this.mines; j++) {
        const point = this.board[j];

        const isTopLeft =
          point.coordinate.y === y - 1 && point.coordinate.x === x - 1;
        const isTop = point.coordinate.y === y - 1 && point.coordinate.x === x;
        const isTopRight =
          point.coordinate.y === y - 1 && point.coordinate.x === x + 1;

        const isLeft = point.coordinate.y === y && point.coordinate.x === x - 1;
        const isRight =
          point.coordinate.y === y && point.coordinate.x === x + 1;

        const isBottomLeft =
          point.coordinate.y + 1 === y && point.coordinate.x === x - 1;
        const isBottom =
          point.coordinate.y + 1 === y && point.coordinate.x === x;
        const isBottomRight =
          point.coordinate.y + 1 === y && point.coordinate.x === x + 1;

        const isAdjacent =
          isTopLeft ||
          isTop ||
          isTopRight ||
          isLeft ||
          isRight ||
          isBottomLeft ||
          isBottom ||
          isBottomRight;

        if (isAdjacent && point.isMine) {
          adjMineCount += 1;
        }
      }

      this.board[lastIdx] = {
        coordinate: { x, y },
        isMine: false,
        adjMine: adjMineCount,
      };
      lastIdx += 1;
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
    const cell = this.mask.find(
      (p) => p.coordinate.x === x && p.coordinate.y === y,
    );
    if (!cell || cell.isReveal) {
      return 0;
    }
    if (this.board[cell.cellIdx].isMine) {
      return 1;
    }

    cell.isReveal = true;

    if (this.board[cell.cellIdx].adjMine === 0) {
      this.revealAdjacentTile(cell);
    }
  }

  revealAll() {
    for (const cell of this.mask) {
      cell.isReveal = true;
    }
  }

  resetMinSweeper() {
    this.#initBoard();
  }

  printGrid() {
    let str = "";
    for (let i = 0; i < this.cols * this.rows; i++) {
      const x = i % this.rows;
      const y = Math.floor(i / this.rows);
      const point = this.mask.find(
        ({ coordinate }) => coordinate.x === x && coordinate.y === y,
      );
      if (point.isReveal) {
        if (this.board[point.cellIdx].isMine) {
          str += "💥";
        } else if (this.board[point.cellIdx].adjMine) {
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
          str += `\x1b[${colors[this.board[point.cellIdx].adjMine]}m${this.board[point.cellIdx].adjMine}\x1b[0m `;
        } else {
          str += "◻ ";
        }
      } else {
        str += "◼ ";
      }
      if (i % this.cols === this.cols - 1) {
        str += "\n";
      }
    }
    console.log(str);
  }

  printBoard() {
    let str = "";
    for (let i = 0; i < this.cols * this.rows; i++) {
      const x = i % this.rows;
      const y = Math.floor(i / this.rows);
      const point = this.board.find(
        ({ coordinate }) => coordinate.x === x && coordinate.y === y,
      );
      if (point.isMine) {
        str += "💥";
      } else {
        // str += point.adjMine + " ";
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
        str += `\x1b[${colors[point.adjMine]}m${point.adjMine}\x1b[0m `;
      }
      if (i % this.cols === this.cols - 1) {
        str += "\n";
      }
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
mineSweeper.printGrid();

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
      mineSweeper.printGrid();
      process.exit();
    }
    mineSweeper.printGrid();
    askQuestion();
  });
}

askQuestion();
