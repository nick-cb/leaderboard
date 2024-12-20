class Tile {
  x = -1;
  y = -1;
  constant = 0;
  isRevealed = false;
  isFlagged = false;
  /** @type {Array<{x:number,y:number}>} neighbors */
  neighbors = [];
  constrains = [0, 0];

  constructor(args) {
    this.x = args.x;
    this.y = args.y;
    this.constant = args.constant;
    this.constrains = args.constrains;
    this.neighbors = this.getNeighbors();
  }

  getNeighbors() {
    const neighbors = [
      { y: this.y - 1, x: this.x - 1 },
      { y: this.y - 1, x: this.x },
      { y: this.y - 1, x: this.x + 1 },
      { y: this.y, x: this.x - 1 },
      { y: this.y, x: this.x + 1 },
      { y: this.y + 1, x: this.x - 1 },
      { y: this.y + 1, x: this.x },
      { y: this.y + 1, x: this.x + 1 },
    ];
    return neighbors.filter(({ x, y }) => {
      return (
        x > this.constrains[0] &&
        x < this.constrains[1] &&
        y > this.constrains[0] &&
        y < this.constrains[1]
      );
    });
  }

  isRevealable() {
    return this.isRevealed === false && this.isFlagged === false;
  }

  isFlagable() {
    return this.isRevealed === false;
  }
}

class MineSweeper {
  rows = 0;
  cols = 0;
  mines = 0;
  seeds;
  /** @type {Array<Array<Tile>>} board */
  board;
  result;
  leftClicks;
  rightClicks;
  revealedTileCount = 0;
  startTime = 0;
  endTime = 0;
  /** @type {Array<Tile>} board */
  trail = [];
  static #empty = Symbol();

  constructor(rows, cols, mines, seeds) {
    if (rows === MineSweeper.#empty) {
      return;
    }
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.seeds = seeds;

    this.initBoard();
    this.putMineOnBoard();
    this.updateNonMineTiles();
  }

  /** @param {Array<Array<number>> | {rows:number,cols:number,tiles:Array<number | Tile>}} board */
  static from(board) {
    const mineSweeper = new MineSweeper(MineSweeper.#empty);
    if (!Array.isArray(board)) {
      mineSweeper.rows = board.rows;
      mineSweeper.cols = board.cols;
      mineSweeper.mines = 0;
      mineSweeper.initBoard();
      for (let i = 0; i < board.tiles.length; i++) {
        const tile = board.tiles[i];
        if (typeof tile === "number") {
          const y = Math.floor(i / mineSweeper.rows);
          const x = i % mineSweeper.cols;
          mineSweeper.board[y][x].constant = tile;
          if (tile === 9) {
            mineSweeper.mines += 1;
          }
        } else {
          mineSweeper.board[tile.y][tile.x].constant = tile.constant;
          mineSweeper.board[tile.y][tile.x].isRevealed = tile.isRevealed;
          mineSweeper.board[tile.y][tile.x].isFlagged = tile.isFlagged;
          if (mineSweeper.board[tile.y][tile.x].constant === 9) {
            mineSweeper.mines += 1;
          }
        }
      }
      mineSweeper.revealedTileCount = mineSweeper.board.flatMap((row) =>
        row.filter((col) => col.isRevealed),
      ).length;

      return mineSweeper;
    }

    mineSweeper.rows = board.length;
    mineSweeper.cols = board[0].length;
    mineSweeper.mines = 0;
    mineSweeper.initBoard();
    for (let y = 0; y < mineSweeper.rows; y++) {
      for (let x = 0; x < mineSweeper.cols; x++) {
        mineSweeper.board[y][x].constant = board[y][x];
        if (mineSweeper.board[y][x].constant === 9) {
          mineSweeper.mines += 1;
        }
      }
    }

    return mineSweeper;
  }

  initBoard() {
    this.board = new Array(this.rows);
    for (let y = 0; y < this.rows; y++) {
      if (!this.board[y]) {
        this.board[y] = new Array(this.cols);
      }
      for (let x = 0; x < this.cols; x++) {
        this.board[y][x] = new Tile({
          x,
          y,
          constant: 0,
          constrains: [-1, this.cols],
        });
      }
    }
  }

  putMineOnBoard() {
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
      } while (this.board[y][x].constant === 9);
      this.board[y][x].x = x;
      this.board[y][x].y = y;
      this.board[y][x].constant = 9;
    }
  }

  updateNonMineTiles() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const tile = this.board[y][x];
        if (tile.constant === 9) {
          for (const { x, y } of tile.neighbors) {
            const neighbor = this.board[y][x];
            if (neighbor.constant === 9) {
              continue;
            }
            this.board[neighbor.y][neighbor.x].constant += 1;
          }
        }
      }
    }
  }

  /**
   * @param {{x:number,y:number}} param
   * @param {(tile: Tile) => void} callback
   * @returns {Tile[]} tiles
   */
  revealTile({ x, y }, callback) {
    const tile = this.board[y][x];
    if (!tile.isRevealable()) return;
    if (this.startTime === 0) this.startTime = Date.now();

    this.leftClicks += 1;
    const revealedTiles = this.#revealTile({ x, y }, callback);
    this.revealedTileCount += revealedTiles.length;
    this.trail.push(...revealedTiles);
    if (this.shouldEndGame(revealedTiles) !== undefined) {
      this.finishGame(this.shouldEndGame(revealedTiles));
    }

    return revealedTiles;
  }

  #revealTile({ x, y }, callback) {
    const tile = this.board[y][x];
    if (!tile.isRevealable()) return [];

    tile.isRevealed = true;
    const revealedTiles = [tile];
    callback?.(tile);

    if (tile.constant === 9) return revealedTiles;
    if (tile.constant === 0) {
      for (const neighbor of tile.neighbors) {
        revealedTiles.push(
          ...this.#revealTile({ x: neighbor.x, y: neighbor.y }, callback),
        );
      }
    }

    return revealedTiles;
  }

  revealAdjTiles({ x, y }) {
    const tile = this.board[y][x];
    if (!tile.isRevealed || tile.isFlagged) return;

    const flaggedTiles = tile.neighbors.filter(({ x, y }) => {
      return this.board[y][x].isFlagged;
    });
    if (flaggedTiles.length !== tile.constant) {
      return [];
    }

    this.leftClicks += 1;
    let revealedTiles = [];
    for (const { x, y } of tile.neighbors) {
      if (tile.isFlagged) {
        continue;
      }
      revealedTiles.push(...this.#revealTile({ x, y }));
      if (this.shouldEndGame(revealedTiles) !== undefined) {
        this.finishGame(this.shouldEndGame(revealedTiles));
        break;
      }
    }
    this.revealedTileCount += revealedTiles.length;
    this.trail.push(...revealedTiles);
    if (this.shouldEndGame(revealedTiles) !== undefined) {
      this.finishGame(this.shouldEndGame(revealedTiles));
    }

    return revealedTiles;
  }

  toggleFlagTile({ x, y }) {
    this.rightClicks += 1;
    const tile = this.board[y][x];
    if (!tile.isFlagable()) return;

    tile.isFlagged = !tile.isFlagged;
    this.trail.push(tile);
    return tile;
  }

  shouldEndGame(revealedTiles) {
    const lastTile = revealedTiles.at(-1);
    if (!lastTile) {
      return undefined;
    }
    if (lastTile.constant === 9 && lastTile.isRevealed) {
      return 0;
    }

    const win = this.revealedTileCount === this.rows * this.cols - this.mines;
    if (win) {
      return 1;
    }

    return undefined;
  }

  finishGame(result) {
    if (this.endTime === 0) this.endTime = Date.now();
    this.result = result;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        this.board[y][x].isRevealed = true;
      }
    }
  }

  isFinished() {
    return typeof this.result === "number";
  }

  calculate3bv() {
    let bv3 = 0;
    let totalSkip = 0;
    const visited = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (visited[y]?.[x]) {
          continue;
        }
        if (this.board[y][x].constant === 0) {
          const tileToVisit = [{ x: x, y: y }];
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
            if (this.board[y][x].constant === 0) {
              for (const neighbor of this.board[y][x].neighbors) {
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

  getBoardAs2DArray() {
    return this.board.map((row) => {
      return row.map((col) => col.constant);
    });
  }

  getMaskedBoardAs2DArray() {
    return this.board.map((row) => {
      return row.map((col) => {
        return col.isFlagged ? "+" : col.isRevealed ? col.constant : "-";
      });
    });
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
}

exports.Tile = Tile;
exports.MineSweeper = MineSweeper;
