const { sfc32 } = require("./utils");
/**
 * @typedef {Object} BoardCell
 * @property {{x: number, y: number}} coordinate
 * @property {boolean} isMine
 * @property {number} adjMine
 * @property {boolean} isReveal
 * @property {boolean} isFlagged
 * @property {Array<{x: number, y: number}>} neighbors
 */

class MineSweeper {
  rows;
  cols;
  mines;
  /** @type {Array<Array<BoardCell>>} board */
  #board;
  /** @type {Array<Array<BoardCell>>} board */
  seeds;
  mineList = [];
  #revealedCount = 0;
  startTime = 0;
  endTime = 0;
  isLost = false;
  isWon = false;
  static #empty = Symbol();

  /** Create a MineSweeper object
   * @param {number} rows
   * @param {number} cols
   * @param {number} mines
   * @param {unknown} seeds
   */
  constructor(rows, cols, mines, seeds) {
    if (rows === MineSweeper.#empty) {
      return;
    }
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.seeds = seeds;
    this.#initBoard();
    this.#putMineOnBoard();
    this.#fillBoardWithMineAdjacentNumbers();
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
          isFlagged: false,
          neighbors: [],
        };
      }
    }
  }

  /** @param {Array<Array<number>> | {rows:number,cols:number,cells:Array<number>}} board */
  static from(board) {
    if (!Array.isArray(board)) {
      const mineSweeper = new MineSweeper(MineSweeper.#empty);
      mineSweeper.rows = board.rows;
      mineSweeper.cols = board.cols;
      mineSweeper.mines = 0;
      mineSweeper.#board = new Array(mineSweeper.rows);
      for (let i = 0; i < board.cells.length; i++) {
        const cell = board.cells[i];
        const y = Math.floor(i / mineSweeper.rows);
        const x = i % mineSweeper.cols;
        if (!mineSweeper.#board[y]) {
          mineSweeper.#board[y] = new Array(mineSweeper.rows);
        }
        if (cell === 9) {
          mineSweeper.mines += 1;
        }
        mineSweeper.#board[y][x] = {
          coordinate: { y, x },
          adjMine: cell,
          isReveal: false,
          isMine: cell === 9,
          neighbors: [],
        };
      }
      for (let i = 0; i < mineSweeper.rows; i++) {
        for (let j = 0; j < mineSweeper.cols; j++) {
          const neighbors = [
            { y: i - 1, x: j - 1 },
            { y: i - 1, x: j },
            { y: i - 1, x: j + 1 },
            { y: i, x: j - 1 },
            { y: i, x: j + 1 },
            { y: i + 1, x: j - 1 },
            { y: i + 1, x: j },
            { y: i + 1, x: j + 1 },
          ];
          for (const neighbor of neighbors) {
            if (mineSweeper.#board[neighbor.y]?.[neighbor.x]) {
              mineSweeper.#board[i][j].neighbors.push(neighbor);
            }
          }
        }
      }
      return mineSweeper;
    }
    const mineSweeper = new MineSweeper(MineSweeper.#empty);
    mineSweeper.rows = board.length;
    mineSweeper.cols = board[0].length;
    mineSweeper.#board = new Array(mineSweeper.rows);

    let mines = 0;
    for (let i = 0; i < mineSweeper.rows; i++) {
      mineSweeper.#board[i] = new Array(mineSweeper.cols);
      for (let j = 0; j < mineSweeper.cols; j++) {
        const isMine = board[i][j] === 9;
        if (isMine) {
          mines += 1;
        }
        mineSweeper.#board[i][j] = {
          coordinate: { x: j, y: i },
          adjMine: board[i][j],
          isReveal: false,
          isMine: isMine,
          neighbors: [],
        };
      }
    }
    mineSweeper.mines = mines;

    for (let i = 0; i < mineSweeper.rows; i++) {
      for (let j = 0; j < mineSweeper.cols; j++) {
        const neighbors = [
          { y: i - 1, x: j - 1 },
          { y: i - 1, x: j },
          { y: i - 1, x: j + 1 },
          { y: i, x: j - 1 },
          { y: i, x: j + 1 },
          { y: i + 1, x: j - 1 },
          { y: i + 1, x: j },
          { y: i + 1, x: j + 1 },
        ];
        for (const neighbor of neighbors) {
          if (mineSweeper.#board[neighbor.y]?.[neighbor.x]) {
            mineSweeper.#board[i][j].neighbors.push(neighbor);
          }
        }
      }
    }

    return mineSweeper;
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
      } while (this.#board[y][x].isMine);
      this.#board[y][x].coordinate = { x, y };
      this.#board[y][x].isMine = true;
      this.#board[y][x].adjMine = 9;
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
          if (!tile.isMine && this.#board[y][x].isMine) {
            tile.adjMine += 1;
          }
          tile.neighbors.push({ x, y });
        }
      }
    }
  }

  /** @param {MaskCell} cell */
  revealAdjacentTile({ coordinate: { x, y } }, callback) {
    this.#revealTile({ y: y - 1, x: x - 1 }, callback);
    this.#revealTile({ y: y - 1, x: x }, callback);
    this.#revealTile({ y: y - 1, x: x + 1 }, callback);
    this.#revealTile({ y: y, x: x - 1 }, callback);
    this.#revealTile({ y: y, x: x + 1 }, callback);
    this.#revealTile({ y: y + 1, x: x - 1 }, callback);
    this.#revealTile({ y: y + 1, x: x }, callback);
    this.#revealTile({ y: y + 1, x: x + 1 }, callback);
  }

  /**
   * @param {{x: number, y: number}} tile
   * @param {(cell: BoardCell) => void} callback
   */
  revealTile({ x, y }, callback) {
    if (this.startTime === 0) {
      this.startTime = Date.now();
    }

    const cell = this.#board[y]?.[x];
    if (!cell || cell.isReveal || cell.isFlagged) {
      return;
    }

    this.#updateGameStatusOnRevealCell(cell);
    if (this.isFinished()) {
      this.finishGame();
      return;
    }

    this.#revealTile({ x, y }, callback);
  }

  /**
   * @param {{x: number, y: number}} tile
   * @param {(cell: BoardCell) => void} callback
   */
  #revealTile({ x, y }, callback) {
    const cell = this.#board[y]?.[x];
    if (!cell || cell.isReveal || cell.isFlagged) {
      return 0;
    }
    if (cell.isMine) {
      return 1;
    }

    cell.isReveal = true;
    callback?.(cell);

    if (cell.adjMine === 0) {
      this.revealAdjacentTile(cell, callback);
    }

    return 0;
  }

  revealAll() {
    for (const row of this.#board) {
      for (const cell of row) {
        cell.isReveal = true;
      }
    }
  }

  resetMinSweeper() {
    this.#initBoard();
  }

  toggleFlagMine({ x, y }) {
    if (this.#board[y][x].isReveal) {
      return;
    }
    if (this.#board[y][x].isFlagged) {
      this.#board[y][x].isFlagged = false;
    } else {
      this.#board[y][x].isFlagged = true;
    }
  }

  printMaskedBoard() {
    let str = "";
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const tile = this.#board[i][j];
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
          if (tile.isFlagged) {
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

  getBoardAsArray() {
    return this.#board.map((row) => {
      return row.map((col) => {
        return col.adjMine;
      });
    });
  }

  getMaskedBoardAsNumberArray() {
    return this.#board.map((row) => {
      return row.map((col) => {
        return col.isFlagged ? "+" : col.isReveal ? col.adjMine : "-";
      });
    });
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

  /** @param {BoardCell} cell */
  #updateGameStatusOnRevealCell(cell) {
    if (this.isFinished()) {
      return;
    }

    this.#revealedCount += 1;
    this.isLost = cell.isMine;
    this.isWon = this.#revealedCount === this.rows * this.cols - this.mines;
  }

  isFinished() {
    return this.isLost || this.isWon;
  }

  finishGame() {
    if (this.endTime === 0) {
      this.endTime = Date.now();
    }
    this.revealAll();
  }

  calculate3bv() {
    let bv3 = 0;
    let totalSkip = 0;
    const visited = [];
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (visited[i]?.[j]) {
          continue;
        }
        if (this.#board[i][j].adjMine === 0) {
          const tileToVisit = [{ x: j, y: i }];
          bv3 += 1;
          const visit = ({ x, y }) => {
            if (visited[y]?.[x]) {
              return [];
            }
            if (!visited[y]) {
              visited[y] = [];
            }

            visited[y][x] = 1;
            totalSkip += 1;
            if (this.#board[y][x].adjMine === 0) {
              for (const neighbor of this.#board[y][x].neighbors) {
                visit(neighbor);
              }
            }
          };
          visit(tileToVisit[0]);
        }
      }
    }

    return this.cols * this.rows - totalSkip - this.mines + bv3;
  }
}

exports.MineSweeper = MineSweeper;
// 99 seconds = 4 trophies
/*
Time: 99.991 sec PB
3BV: 48
3BV/s: 0.4800
Clicks: 99+7
Efficiency: 45%
Experience: +48⭐
Minecoins: +8🟡
Mastery: 17
Win streak: 1

Trophies: +4+5[S107]


Time: 103.311 sec
3BV: 51
3BV/s: 0.4937
Clicks: 93+2
Efficiency: 54%
Experience: +51⭐
Minecoins: +8🟡
Honour points: +1🌟
Mastery: 18
Win streak: 1

Trophies: 	
+1
*/

/*
Time: 173.433 sec
3BV: 83
3BV/s: 0.4786
Clicks: 129+7
Efficiency: 61%
Experience: +83⭐
Minecoins: +8🟡
Activity: +1⚡
Mastery: 19
Win streak: 1

Trophies: 	
+1[S107]
*/
