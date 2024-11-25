const { execFile, exec } = require("child_process");
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
   * @property {number} time
   * @property {Array<{coordinate: [number,number], type: string}>} trail
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
      if (part1[0] === "(") {
        part1 = part1.substring(2);
      }
      // } else if (part1[0] === " ") {
      //   part1 = part1.substring(3);
      // }
      part2 = part2.substring(0, part2.length - 1);
      part3 = part3.substring(1, part3.length - 1);
      if (part3.at(-1) === "'") {
        part3 = part3.substring(0, part3.length - 1);
      }
      this.trail[i] = {
        coordinate: [parseInt(part1), parseInt(part2)],
        type: part3,
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
    this.mineSweeper.initMineSweeperFromArray(rows);
    this.mineSweeper.printBoard();
  }

  getStats() {
    return {
      time: this.endTime - this.startTime,
      clicks: this.trail.length,
      leftClicks: this.trail.filter((click) => click.type === "uncovered"),
      rightClicks: this.trail.filter((click) => click.type === "flagged"),
    };
  }
}

module.exports = { MinesweeperSolver, LvngdStrategy };
