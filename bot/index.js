const { MineSweeper } = require("../minesweeper/index.js");
const cron = require("../cron/index");
const { seed10, seed40 } = require("./seed.js");
const {
  MinesweeperSolver,
  LvngdStrategy,
} = require("../minesweeper/solvers/index.js");
const mongoose = require("mongoose");
const { Stats } = require("./schemas/stats.js");

async function start() {
  await mongoose
    .connect("mongodb://127.0.0.1:27018/minesweeper")
    .then(() => {
      console.log("Connectted to database");
    })
    .catch((error) => console.log(error));

  const time = (start, skip) => {
    let str = "";
    for (let i = start; i < 59; i += skip) {
      if (i > start) {
        str += ",";
      }
      str += i;
    }
    return str;
  };
  runBot(time(0, 3) + " * * * * *");
  runBot(time(1, 3) + " * * * * *");
  runBot(time(2, 3) + " * * * * *");
}

function runBot(expression) {
  const id = Date.now();
  console.log("Bot " + id + " is running");
  cron.schedule(expression, async () => {
    console.log(`Bot ${id}: New game`);
    const mineSweeper = new MineSweeper(16, 16, 40, seed40);
    try {
      const solver = new MinesweeperSolver(new LvngdStrategy(mineSweeper));
      const stats = await solver.startGame();
      const stat = new Stats({
        userId: id,
        startTime: stats.startTime,
        endTime: stats.endTime,
        trail: stats.trail,
        clicks: stats.clicks,
        leftClick: stats.leftClicks,
        rightClick: stats.rightClicks,
        bv3: stats.bv3,
        bv3PerSecond: stats.bv3PerSecond,
        game: stats.game,
      });

      await stat.save();
      console.log(`Bot ${id}: Saved game stat ${stat._id}`);
      console.log("\n");
    } catch (error) {
      console.log(`Bot ${id}: Stop game due to error`);
      console.log(error);
      console.log("\n");
    }
  });
}

start();
