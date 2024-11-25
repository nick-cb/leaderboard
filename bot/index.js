const { MineSweeper } = require("../minesweeper/index.js");
const cron = require("../cron/index");
const { seed10, seed40 } = require("./seed.js");
const {
  MinesweeperSolver,
  LvngdStrategy,
} = require("../minesweeper/solvers/index.js");

cron.schedule("*/5 * * * * *", async () => {
  const mineSweeper = new MineSweeper(16, 16, 40, seed40);
  try {
    const solver = new MinesweeperSolver(new LvngdStrategy(mineSweeper));
    const stats = await solver.startGame();
  } catch (error) {
    console.log(error);
  }
});
