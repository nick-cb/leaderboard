const { exec } = require("child_process");
const path = require("path");
const util = require("util");
const { MineSweeper } = require("..");

class MinesweeperSolver {
  /** @type {MinesweeperSolverStrategy} strategy */
  strategy;

  /** @param {MinesweeperSolverStrategy} strategy */
  constructor(strategy) {
    this.strategy = strategy;
  }

  async startGame() {
    await this.strategy.startGame();
    return this.strategy.getStats();
  }
}

class MinesweeperSolverStrategy {
  /** @type {MineSweeper} mineSweeper */
  mineSweeper;

  /** @param {MineSweeper} mineSweeper */
  constructor(mineSweeper) {}

  async startGame() {
    throw new Error("Not implemented");
  }

  /**
   * @typedef {Object} Stats
   * @property {number} startTime
   * @property {number} endTime
   * @property {Array<{coordinate: [number,number], type: string}>} trail
   * @property {number} clicks
   * @property {number} leftClicks
   * @property {number} rightClicks
   * @property {number} bv3
   * @property {number} bv3PerSecond
   * @property {Array<Array<number>>} board
   * @returns {Stats} stats
   */
  getStats() {
    throw new Error("Not implemented");
  }
}

class LvngdStrategy extends MinesweeperSolverStrategy {
  startTime = 0;
  endTime = 0;
  clicks = 0;
  trail = [];
  board = [];
  /** @param {MineSweeper} mineSweeper */
  constructor(mineSweeper) {
    super();
    this.mineSweeper = mineSweeper;
  }

  async startGame() {
    const execPromise = util.promisify(exec);
    this.startTime = Date.now();
    const { stdout, stderr } = await execPromise(
      "python3 " + path.join(__dirname, "lvngd", "main.py"),
      { timeout: 5000 },
    );
    this.endTime = Date.now();

    const rows = stdout.split("\n");
    rows.pop(); // the last new line create an invalid row, so we remove it
    this.trail = rows.pop();
    this.trail = this.trail.substring(1, this.trail.length - 1);
    this.trail = this.trail.split("), ((");
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i] = this.trail[i].split(", ");
      let part1 = this.trail[i][0];
      let part2 = this.trail[i][1];
      let part3 = this.trail[i][2];
      let part4 = this.trail[i][3];
      if (part1[0] === "(") {
        part1 = part1.substring(2);
      }
      part2 = part2.substring(0, part2.length - 1);
      part3 = part3.substring(1, part3.length - 1);
      if (part3.at(-1) === "'") {
        part3 = part3.substring(0, part3.length - 1);
      }
      if (part4.at(-1) === "'") {
        part4 = part4.substring(0, part4.length - 1);
      }
      this.trail[i] = {
        coordinate: [parseInt(part1), parseInt(part2)],
        type: part3,
        timestamp: parseFloat(part4),
      };
    }

    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      row = row.substring(1, row.length - 1);
      rows[i] = row.split(", ");
      for (let j = 0; j < rows[i].length; j++) {
        const col = rows[i][j];
        if (isNaN(col)) {
          throw new Error(`Invalid value (${i}, ${j}): ${col}`);
        }
        rows[i][j] = parseInt(col);
      }
    }
    this.board = rows;
    this.mineSweeper = MineSweeper.from(rows);
    this.mineSweeper.finishGame(1);
    this.mineSweeper.printBoard();
  }

  getStats() {
    const leftClicks = this.trail.filter(
      (click) => click.type === "uncovered",
    ).length;
    const bv3 = this.mineSweeper.calculate3bv();

    return {
      startTime: this.startTime,
      endTime: this.endTime,
      clicks: this.trail.length,
      leftClicks: leftClicks,
      rightClicks: this.trail.filter((click) => click.type === "flagged")
        .length,
      bv3: bv3,
      bv3PerSecond: leftClicks / bv3,
      board: this.board,
      trail: this.trail,
      rows: this.mineSweeper.rows,
      cols: this.mineSweeper.cols,
      mines: this.mineSweeper.mines,
      result: this.mineSweeper.isWon ? 1 : 0,
    };
  }
}

module.exports = { MinesweeperSolver, LvngdStrategy };
