/** @typedef {import('./index.js').MineSweeper} MineSweeper */
/** @typedef {import('./index.js').BoardCell} BoardCell */
const { seed10, seed40 } = require("./seed.js");

const { MineSweeper } = require("./index.js");

class MinesweeperSolver {
  /** @type {MineSweeper} mineSweeper */
  mineSweeper;
  /** @type {Array<Array<BoardCell>>} board */
  copied;
  /** @type {Array<BoardCell>} board */
  safes = [];
  /** @type {Array<BoardCell>} board */
  mines = [];
  /** @type {Array<BoardCell>} board */
  unknowns = [];
  /** @type {Array<BoardCell>} board */
  moves = [];

  constructor(mineSweeper) {
    this.mineSweeper = mineSweeper;
    for (let i = 0; i < this.mineSweeper.rows; i++) {
      for (let j = 0; j < this.mineSweeper.cols; j++) {
        this.moves.push(this.mineSweeper.maskedBoard[i][j]);
      }
    }
  }

  /** @param {{x: number, y: number}} startingPoint */
  startGame(startingPoint = { x: 0, y: 0 }) {
    this.mineSweeper.revealTile(startingPoint, (cell) => {
      const index = this.moves.indexOf(cell);
      if (index !== -1) {
        this.moves.splice(index, 1);
      }
    });
    while (this.moves.length && !this.mineSweeper.isFinished()) {
      console.log({len: this.moves.length})
      this.mineSweeper.printMaskedBoard();
      for (const move of this.moves) {
        for (const neighbor of move.neighbors) {
          const cell = this.mineSweeper.maskedBoard[neighbor.y][neighbor.x];
          const unRevealNeigbors = cell.neighbors.filter((n) => {
            return !this.mineSweeper.maskedBoard[n.y][n.x].isReveal;
          });
          if (cell.adjMine === unRevealNeigbors.length) {
            for (const neighbor of unRevealNeigbors) {
              this.markTileAsMine(neighbor);
            }
          } else if (cell.adjMine === 0) {
            if (cell.coordinate.x === 1 && cell.coordinate.y === 2) {
              console.log(unRevealNeigbors)
            }
            console.log({unRevealNeigbors});
            for (const neighbor of unRevealNeigbors) {
              if (
                !this.mineSweeper.maskedBoard[neighbor.y][neighbor.x].isMine
              ) {
                this.marktileAsSafe(neighbor);
              }
            }
          }
        }
      }

      let len = this.mines.length;
      for (let i = 0; i < len; i++) {
        const mine = this.mines.pop();
        for (const { x, y } of mine.neighbors) {
          const neighborCell = this.mineSweeper.maskedBoard[y][x];
          if (!neighborCell.isReveal || neighborCell.isMine) {
            continue;
          }
          neighborCell.adjMine -= 1;
        }
      }
    }
  }

  markTile({ x, y }) {
    const cell = this.mineSweeper.maskedBoard[y][x];
    const unRevealNeigbors = cell.neighbors.filter((n) => {
      return !this.mineSweeper.maskedBoard[n.y][n.x].isReveal;
    });
    if (cell.adjMine === unRevealNeigbors.length) {
      for (const neighbor of unRevealNeigbors) {
        this.markTileAsMine(neighbor);
      }
    } else if (cell.adjMine === 0) {
      for (const neighbor of unRevealNeigbors) {
        this.marktileAsSafe(neighbor);
      }
    }
  }

  markTileAsMine({ x, y }) {
    this.mineSweeper.flagMine({ x, y });
    if (!this.mines.find((m) => m.coordinate.y === y && m.coordinate.x === x)) {
      this.mines.push(this.mineSweeper.maskedBoard[y][x]);
    }
    const index = this.moves.indexOf(this.mineSweeper.maskedBoard[y][x]);
    if (index !== -1) {
      this.moves.splice(index, 1);
    }
  }

  marktileAsSafe({ x, y }) {
    this.mineSweeper.revealTile({ x, y }, (cell) => {
      const index = this.moves.indexOf(cell);
      if (index !== -1) {
        this.moves.splice(index, 1);
      }
    });
    this.safes.push(this.mineSweeper.maskedBoard[y][x]);
  }
}

module.exports = { MinesweeperSolver };

const mineSweeper = new MineSweeper(16, 16, 40, seed40);
mineSweeper.initMinSweeper();
const solver = new MinesweeperSolver(mineSweeper);
solver.startGame();
mineSweeper.printMaskedBoard();
// mineSweeper.printBoard();
