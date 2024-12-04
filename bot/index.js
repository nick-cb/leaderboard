const cron = require("../cron/index");
const {
  MinesweeperSolver,
  LvngdStrategy,
} = require("../minesweeper/solvers/index.js");
const http = require("http");
const util = require("util");

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
  runBot(1, time(0, 3) + " * * * * *");
  // runBot(time(1, 3) + " * * * * *");
  // runBot(time(2, 3) + " * * * * *");
}

function runBot(botId, expression) {
  console.log("Bot " + botId + " is running");
  cron.schedule(expression, async () => {
    console.log(`Bot ${botId}: New game`);
    try {
      const solver = new MinesweeperSolver(new LvngdStrategy());
      const stats = await solver.startGame();
      stats.userId = botId;
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
          let resBody;
          res.on("data", (chunk) => {
            if (!resBody) {
              resBody = chunk;
              return;
            }
            resBody += chunk;
          });
          res.on("end", () => {
            const data = JSON.parse(resBody.toString());
            if ("error" in data) {
              throw new Error(data.error);
            }
            console.log(`Bot ${botId}: Saved game stat ${data.gameId}`);
            console.log("\n");
          });
        },
      );
      request.on("error", (error) => {
        console.error(`Bot ${botId}: Stop game due to error`);
        console.error(error);
        console.log("\n");
      });
      request.on("close", () => {});

      request.write(body);
    } catch (error) {
      console.error(`Bot ${botId}: Stop game due to error`);
      console.error(error);
      console.log("\n");
    }
  });
}

start();
