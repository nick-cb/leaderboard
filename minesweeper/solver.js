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
  /** @type {Array<{x:number, y:number}>} squareToCheck */
  tileToCheck = [];

  constructor(mineSweeper) {
    this.mineSweeper = mineSweeper;
    this.tileToCheck = [{ x: 0, y: 0 }];
    // this.moves = [this.mineSweeper.maskedBoard[0][0]];
    // for (let i = 0; i < this.mineSweeper.rows; i++) {
    //   for (let j = 0; j < this.mineSweeper.cols; j++) {
    //     this.moves.push(this.mineSweeper.maskedBoard[i][j]);
    //   }
    // }
  }

  /** @param {{x: number, y: number}} startingPoint */
  startGame() {
    while (this.tileToCheck.length) {
      const tile = this.tileToCheck.pop();
      this.mineSweeper.revealTile(tile, (cell) => {
        if (cell.adjMine > 0) {
          this.moves.push(cell);
        }
      });
      const movesToRemove = [];
      for (const move of this.moves) {
        const unRevealNeigbors = this.getUnRevealNeighbors(move.coordinate);
        if (move.adjMine === unRevealNeigbors.length) {
          movesToRemove.push(move);
          for (const neighbor of unRevealNeigbors) {
            this.markTileAsMine(neighbor);
          }
        } else if (move.adjMine === 0) {
          movesToRemove.push(move);
          for (const neighbor of unRevealNeigbors) {
            this.tileToCheck.push(neighbor);
          }
        }
      }
      console.log({ movesToRemove: movesToRemove.map((m) => m.coordinate) });
      for (const move of movesToRemove) {
        this.removeMove(move.coordinate);
      }
      if (this.moves.length) {
        for (let i = 0; i < this.moves.length; i++) {
          const a = this.moves[i];
          const aUnRevealNeighbors = this.getUnRevealNeighbors(a.coordinate);
          for (let j = i + 1; j < this.moves.length; j++) {
            const b = this.moves[j];
            if (
              !a.neighbors.find(
                ({ x, y }) => x === b.coordinate.x && y === b.coordinate.y,
              )
            ) {
              continue;
            }
            const bUnRevealedNeighbors = this.getUnRevealNeighbors(
              b.coordinate,
            );
            if (
              bUnRevealedNeighbors.length === 0 ||
              aUnRevealNeighbors.length === 0
            ) {
              continue;
            }
            if (this.isSubset(bUnRevealedNeighbors, aUnRevealNeighbors)) {
              const safeNeighbors = aUnRevealNeighbors.filter((n) => {
                return !bUnRevealedNeighbors.find(
                  (n2) => n2.x === n.x && n2.y === n.y,
                );
              });
              if (safeNeighbors.length === a.adjMine) {
                for (const safeTile of safeNeighbors) {
                  this.tileToCheck.push(safeTile);
                }
              }
            }
            if (
              this.isSubset(
                aUnRevealNeighbors,
                bUnRevealedNeighbors,
                // a.coordinate.x === 1 &&
                //   a.coordinate.y === 3 &&
                //   b.coordinate.x === 2 &&
                //   b.coordinate.y === 3,
              )
            ) {
              const safeNeighbors = bUnRevealedNeighbors.filter((n) => {
                return !aUnRevealNeighbors.find(
                  (n2) => n2.x === n.x && n2.y === n.y,
                );
              });
              if (safeNeighbors.length === b.adjMine) {
                for (const safeTile of safeNeighbors) {
                  this.tileToCheck.push(safeTile);
                }
              }
            }
          }
        }
      }
      console.log({
        moves: this.moves.map((m) => m.coordinate),
        tileToCheck: this.tileToCheck,
      });
    }

    // while (this.moves.length) {
    //   const move = this.moves.pop();
    //   this.mineSweeper.printMaskedBoard();
    //   const unRevealNeigbors = move.neighbors.filter((n) => {
    //     return !this.mineSweeper.maskedBoard[n.y][n.x].isReveal;
    //   });
    //   if (move.adjMine === unRevealNeigbors.length) {
    //     for (const neighbor of unRevealNeigbors) {
    //       this.markTileAsMine(neighbor);
    //     }
    //   } else if (move.adjMine === 0) {
    //     for (const neighbor of unRevealNeigbors) {
    //       if (!this.mineSweeper.maskedBoard[neighbor.y][neighbor.x].isMine) {
    //         this.marktileAsSafe(neighbor);
    //       }
    //     }
    //   }
    // }

    // if (!this.mineSweeper.isFinished()) {
    //   for (let i = 0; i < this.mineSweeper.rows; i++) {
    //     for (let j = 0; j < this.mineSweeper.cols; j++) {
    //       const cell = this.mineSweeper.maskedBoard[i][j];
    //       if (!cell.isReveal || cell.isMine) {
    //         continue;
    //       }
    //       const unRevealNeigbors = this.getUnRevealNeighbors(cell.coordinate);
    //       if (unRevealNeigbors.length === 0) {
    //         continue;
    //       }
    //       for (const neighbor of cell.neighbors) {
    //         const neighborCell =
    //           this.mineSweeper.maskedBoard[neighbor.y][neighbor.x];
    //         if (!neighborCell.isReveal) {
    //           continue;
    //         }
    //         const neighborCellUnrevealedNeighbors =
    //           this.getUnRevealNeighbors(neighbor);
    //         const set =
    //           unRevealNeigbors.length >= neighborCellUnrevealedNeighbors.length
    //             ? unRevealNeigbors
    //             : neighborCellUnrevealedNeighbors;
    //         const subSet =
    //           unRevealNeigbors.length < neighborCellUnrevealedNeighbors.length
    //             ? unRevealNeigbors
    //             : neighborCellUnrevealedNeighbors;
    //         if (subSet.length === 0) {
    //           continue;
    //         }

    //         const safeNeighbors = set.filter((n) => {
    //           return !subSet.find((n2) => n2.x === n.x && n2.y === n.y);
    //         });
    //         for (const safeTile of safeNeighbors) {
    //           this.startGame(safeTile);
    //         }
    //       }
    //     }
    //   }
    // }
    // console.log({ lost: this.mineSweeper.isLost, won: this.mineSweeper.isWon });
    // if (safeTiles) {
    //   this.startGame(safeTiles);
    // }
  }

  markTileAsMine({ x, y }) {
    const mine = this.mineSweeper.maskedBoard[y][x];
    this.mineSweeper.flagMine({ x, y });
    if (!this.mines.find((m) => m.coordinate.y === y && m.coordinate.x === x)) {
      this.mines.push(this.mineSweeper.maskedBoard[y][x]);
    }

    for (const { x, y } of mine.neighbors) {
      const neighborCell = this.mineSweeper.maskedBoard[y][x];
      if (!neighborCell.isReveal || neighborCell.isMine) {
        continue;
      }
      neighborCell.adjMine -= 1;
      // if (neighborCell.adjMine === 0) {
      //   this.moves.push(neighborCell);
      // }
    }
    // const index = this.moves.indexOf(this.mineSweeper.maskedBoard[y][x]);
    // if (index !== -1) {
    //   this.moves.splice(index, 1);
    // }
  }

  marktileAsSafe({ x, y }) {
    this.mineSweeper.revealTile({ x, y }, (cell) => {
      const index = this.moves.indexOf(cell);
      if (cell.adjMine > 0 && index === -1) {
        this.moves.push(cell);
      }
    });
    this.safes.push(this.mineSweeper.maskedBoard[y][x]);
  }

  getUnRevealNeighbors({ x, y }) {
    return this.mineSweeper.maskedBoard[y][x].neighbors.filter((n) => {
      return (
        !this.mineSweeper.maskedBoard[n.y][n.x].isReveal &&
        !this.mineSweeper.maskedBoard[n.y][n.x].isMine
      );
    });
  }

  removeMove({ x, y }) {
    const index = this.moves.findIndex(
      (m) => m.coordinate.y === y && m.coordinate.x === x,
    );
    console.log({ x, y, index });
    if (index !== -1) {
      this.moves.splice(index, 1);
    }
  }

  isSubset(subSet, set, debug) {
    if (subSet.length > set.length) {
      return false;
    }
    const out = subSet.filter((subItem) => {
      return !set.find(
        (setItem) => setItem.x === subItem.x && setItem.y === subItem.y,
      );
    });
    if (debug) {
      console.log({ out });
    }
    return out.length === 0;
  }
}

module.exports = { MinesweeperSolver };

const mineSweeper = new MineSweeper(16, 16, 40, seed40);
mineSweeper.initMinSweeper();
const solver = new MinesweeperSolver(mineSweeper);
solver.startGame();
mineSweeper.printMaskedBoard();
// mineSweeper.printBoard();
