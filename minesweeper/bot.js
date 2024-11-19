const { MineSweeper } = require(".");
const cron = require("../cron/index");
const { seed10, seed40 } = require("./seed.js");
const { MinesweeperSolver } = require("./solver.js");

cron.schedule("*/10 * * * * *", () => {
  const mineSweeper = new MineSweeper(16, 16, 40, seed40);
  mineSweeper.initMinSweeper();
  const solver = new MinesweeperSolver(mineSweeper);
  solver.startGame();
  mineSweeper.printMaskedBoard();
  if (mineSweeper.isFinished()) {
  }
});
