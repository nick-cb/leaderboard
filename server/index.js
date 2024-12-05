const http = require("node:http");
const { MineSweeper } = require("../minesweeper/index.js");
const scores = require("./scores.json");
const mysql = require("mysql2/promise.js");

/** @type {mysql.Connection} connection */
let connection;
(async () => {
  try {
    connection = await mysql.createConnection(
      "mysql://root:@localhost:3306/minesweeper",
    );
    await connection.ping();
    console.log("connected to database!\n\n");
  } catch (error) {
    console.log(error);
  }
})();

/** @type {Array<[number, MineSweeper]>} games */
let gamePools = [];
async function getGameFromPoolOrFromDatabase(gameId) {
  let game = gamePools.find((g) => g[0] === gameId);
  if (game) {
    return game[1];
  }
  const [gameRows, _] = await connection.query(
    sql(`select row_count, col_count from games where ID=${id}`).toSqlString(),
  );
  game = gameRows[0];
  if (!game) {
    return null;
  }
  const [cellRows, __] = await connection.query(
    sql(
      `select constant from cells where game_id=${id} order by x,y `,
    ).toSqlString(),
  );
  const mineSweeper = MineSweeper.from({
    rows: game.row_count,
    cols: game.col_count,
    cells: cellRows.map((cell) => cell.constant),
  });

  gamePools.push([gameId, mineSweeper]);
  return mineSweeper;
}

const server = http.createServer();
server.on("clientError", (err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

/** @type {Array<[number, MineSweeper]>} games */
const games = [];
server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
  res.setHeader("Access-Control-Max-Age", 2592000);
  res.json = (input) => {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(input));
  };

  if (!req.url) {
    res.statusCode = 404;
    res.statusMessage = "Not found";
    res.end("Not found");
    return;
  }

  const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  if (url.pathname === "/game/new") {
    const mode = url.searchParams.get("mode");
    if (!mode) {
      res.json({ error: "Game mode not found" });
      return;
    }
    if (mode != 2) {
      res.json({ error: "Invalid game mode" });
      return;
    }

    const minesweeper = new MineSweeper(16, 16, 40);
    const queryResult = await connection.query(
      sql(`
        insert into games(user_id,
                          start_time,
                          end_time,
                          click_count,
                          left_click_count,
                          right_click_count,
                          bv3,
                          bv3_per_second,
                          result,
                          board,
                          game_mode,
                          row_count,
                          col_count,
                          mine_count,
                          efficiency,
                          experience)
        values (${null},
                ${null},
                ${null},
                ${0},
                ${0},
                ${0},
                ${0},
                ${0},
                ${null},
                '${minesweeper.getBoardAsArray()}',
                2,
                ${minesweeper.rows},
                ${minesweeper.cols},
                ${minesweeper.mines},
                0,
                0);
      `).toSqlString(),
    );

    if (queryResult[0] && "insertId" in queryResult[0]) {
      const gameId = queryResult[0].insertId;
      games.push([gameId, minesweeper]);
      res.json({
        id: gameId,
        game: minesweeper.getMaskedBoardAsNumberArray(),
      });
      return;
    }
    res.end("error");
    return;
  }

  if (/\/game\/\d+\/reveal-tile/.test(url.pathname)) {
    let coordinate = url.searchParams.get("coordinate");
    if (!coordinate) {
      res.json({ error: "Please pass in coordinate" });
      return;
    }
    coordinate = coordinate.split(",");
    if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
      res.json({
        error: "Invalid coordinate, the format must be <number>,<number>",
      });
      return;
    }
    coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];

    const minesweeper = await getGameFromPoolOrFromDatabase(parseInt(id));
    if (!minesweeper) {
      res.json({ error: "Game not found" });
      return;
    }
    minesweeper.revealTile({ x: coordinate[0], y: coordinate[1] });

    res.json({
      id: id,
      game: minesweeper.getMaskedBoardAsNumberArray(),
    });
    return;
  }

  if (/\/game\/\d+\/flag-tile/.test(url.pathname)) {
    let coordinate = url.searchParams.get("coordinate");
    if (!coordinate) {
      res.json({ error: "Please pass in coordinate" });
      return;
    }
    coordinate = coordinate.split(",");
    if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
      res.json({
        error: "Invalid coordinate, the format must be <number>,<number>",
      });
      return;
    }
    coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];

    const id = url.pathname.split("/")[2];
    const minesweeper = await getGameFromPoolOrFromDatabase(parseInt(id));
    if (!minesweeper) {
      res.json({ error: "Game not found" });
      return;
    }

    minesweeper.toggleFlagMine({ x: coordinate[0], y: coordinate[1] });
    res.json({
      id: id,
      game: minesweeper.getMaskedBoardAsNumberArray(),
    });
    return;
  }

  if (
    req.method === "POST" &&
    req.headers["content-type"].toLowerCase() === "application/json" &&
    url.pathname === "/bot/game/save"
  ) {
    let body;
    req.on("data", (chunk) => {
      if (!body) {
        body = chunk;
        return;
      }
      body += chunk;
    });

    req.on("end", async () => {
      if (!Buffer.isBuffer(body)) {
        res.end("Invalid data type");
        return;
      }

      const data = JSON.parse(body.toString());
      const queryResult = await connection.query(
        sql(`
        insert into games(user_id,
                          start_time,
                          end_time,
                          click_count,
                          left_click_count,
                          right_click_count,
                          bv3,
                          bv3_per_second,
                          result,
                          board,
                          game_mode,
                          row_count,
                          col_count,
                          mine_count,
                          efficiency,
                          experience)
        values (${data.userId},
                '${convertDateToSqlDate(new Date(data.startTime))}',
                '${convertDateToSqlDate(new Date(data.endTime))}',
                ${data.clicks},
                ${data.leftClicks},
                ${data.rightClicks},
                ${data.bv3},
                ${data.bv3PerSecond},
                ${data.result},
                '${data.board.flatMap((row) => row).join(",")}',
                2,
                ${data.rows},
                ${data.cols},
                ${data.mines},
                0,
                0);
      `).toSqlString(),
      );
      if (queryResult[0] && "insertId" in queryResult[0]) {
        const gameId = queryResult[0].insertId;
        await connection.query(
          sql(`
          insert into cells(game_id, x, y, is_revealed, is_flagged, constant, timestamp)
          values ${data.trail
            .map((trail) => {
              const x = trail.coordinate[0];
              const y = trail.coordinate[1];
              return `(${gameId}, ${x},${y},${trail.type === "uncovered"}, ${trail.type === "flagged"},${data.board[y][x]},'${convertDateToSqlDate(new Date(trail.timestamp))}')`;
            })
            .join(",")}
        `).toSqlString(),
        );

        res.json({ gameId });
        return;
      }

      res.json({ error: "Failed to insert game to database" });
    });
    return;
  }

  if (/\/game\/\d+/.test(url.pathname)) {
    let id = url.pathname.split("/")[2];
    if (!id) {
      res.json({ error: "Game not found" });
      return;
    }
    id = parseInt(id);
    const mineSweeper = await getGameFromPoolOrFromDatabase(id);
    if (!mineSweeper) {
      res.json({ error: "Game not found" });
      return;
    }
    res.json({ gameId: id, board: mineSweeper.getBoardAsArray() });
    return;
  }

  res.statusCode = 404;
  res.statusMessage = "Not found";
  res.end("Not found");
});
/*
 * - A socket can either be alive or destroyed depended on the "keepAlive" option
   - The "keepAlive" option is not the same as "Connection: keep-alive" header
 * - The server may close the idle connections or refuse multiple requests over same
 connection
 * - Q: What is a socket? What is a connection? How do they relate?
 * 
 */

/** @param {MineSweeper} mineSweeper */
function calculateScore(user) {
  /* - win score
   * - time score
   * - mastery: number of wins out of 100 games
   */

  return (
    calculateWinStreakScore({ winStreak: user.winStreak }) +
    calculateBestTimeScore({ bestTime: user.bestTime }) +
    calculateMasteryScore({ winCount: user.winCount })
  );
}

function calculateWinStreakScore({ winStreak }) {
  for (const [key, value] of Object.entries(scores[0].wsScore)) {
    if (value == user.winStreak) {
      return parseInt(key);
    }
  }
  return 0;
}

function calculateBestTimeScore({ bestTime }) {
  const timeScores = Object.entries(scores[0].timeScore);
  for (let i = 0; i < timeScores.length; i++) {
    const [score, time] = timeScores[i];
    if (bestTime === time) {
      return parseInt(score);
    }
    if (bestTime > time) {
      const [_, previousTime] = timeScores[i - 1];
      const timeDiff = (time - previousTime) / 10;
      const slowerBy = Math.round(bestTime - time);
      return score - Math.round(slowerBy / timeDiff);
    }
  }
  return 0;
}

function calculateMasteryScore({ gameHistory }) {
  const winCount = gameHistory.filter((game) => (game.won = true)).length;
  return scores[0].winsScore[winCount];
}

/** @param {Date} date */
function convertDateToSqlDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dom = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, dom].join("-") + " " + [hour, minute, second].join(":");
}

const sql = mysql.raw;

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on("beforeExit", () => {
  connection.destroy();
});
