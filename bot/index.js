const cron = require("../cron/index");
const {
  MinesweeperSolver,
  LvngdStrategy,
} = require("../minesweeper/solvers/index.js");
const http = require("http");

function start() {
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
    try {
      const solver = new MinesweeperSolver(new LvngdStrategy());
      const stats = await solver.startGame();
      const body = JSON.stringify(stats);
      const request = http.request(
        {
          method: "POST",
          host: "localhost",
          port: 8000,
          path: "/bot/game/save",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          console.log(`STATUS: ${res.statusCode}`);
          console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            console.log(`BODY: ${chunk}`);
          });
          res.on("end", () => {
            console.log("No more data in response.");
          });
        },
      );
      request.write(body);
      console.log(`Bot ${id}: Saved game stat ${stats._id}`);
      console.log("\n");
    } catch (error) {
      console.log(`Bot ${id}: Stop game due to error`);
      console.log(error);
      console.log("\n");
    }
  });
}

start();
