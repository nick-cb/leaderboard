const mysql = require("mysql2/promise.js");
const { MineSweeper } = require("../minesweeper");

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

/** @type {Array<[gameId, MineSweeper]>} gamePools */
const gamePool = [];

/**
 * @param {number} mode
 * @returns {Promise<[number, MineSweeper]>} result
 */
async function newGame({ mode }) {
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
                '${minesweeper.getBoardAsConstantArray()}',
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
    await connection.query(
      sql(`
          insert into cells(game_id, x, y, is_revealed, is_flagged, constant, timestamp)
          values ${minesweeper
            .getBoardAsConstantArray()
            .flatMap((row, y) => {
              return row.map((col, x) => {
                return `(${gameId}, ${x},${y},${false},${false},${col},${null})`;
              });
            })
            .join(",")}
        `).toSqlString(),
    );
    gamePool.push([gameId, minesweeper]);
    return [gameId, minesweeper];
  }

  throw new Error("Failed to create game");
}

async function newGameFromBot({ data }) {
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

    return { gameId };
  }

  throw new Error("Failed to insert game to database");
}

async function revealTile(gameId, { x, y }) {
  const minesweeper = await getGameFromPoolOrFromDatabase(gameId);
  const tiles = minesweeper.revealTile({ x, y });
  if (tiles.length) {
    await connection.query(
      sql(`
        update cells
        set is_revealed=${true}
        where game_id=${gameId}
        and ${tiles
          .map((tile) => {
            return `(x=${tile.coordinate.x} and y=${tile.coordinate.y})`;
          })
          .join(" or ")}
      `).toSqlString(),
    );
  }
  return minesweeper;
}

async function toggleFlagMine(gameId, { x, y }) {
  const minesweeper = await getGameFromPoolOrFromDatabase(gameId);
  const tile = minesweeper.toggleFlagMine({ x, y });
  if (tile) {
    await connection.query(
      sql(`
        update cells
        set is_flagged=${true}
        where game_id=${gameId}
        and (x=${tile.coordinate.x} and y=${tile.coordinate.y})
      `).toSqlString(),
    );
  }
  return minesweeper;
}

async function getGameFromPoolOrFromDatabase(gameId) {
  let [_, game] = gamePool.find((g) => g[0] === gameId) || [];
  if (game) {
    return game;
  }

  const [gameRows, __] = await connection.query(
    sql(
      `select row_count, col_count from games where ID=${gameId}`,
    ).toSqlString(),
  );
  game = gameRows[0];
  if (!game) {
    return null;
  }

  const [cellRows, ___] = await connection.query(
    sql(
      `select constant, x, y, is_flagged, is_revealed from cells where game_id=${gameId} order by x,y `,
    ).toSqlString(),
  );

  game = MineSweeper.from({
    rows: game.row_count,
    cols: game.col_count,
    cells: cellRows.map((cell) => ({
      coordinate: { x: cell.x, y: cell.y },
      adjMine: cell.constant,
      isMine: cell.constant === 9,
      isFlagged: !!parseInt(cell.is_flagged.toString()),
      isReveal: !!parseInt(cell.is_revealed.toString()),
    })),
  });

  gamePool.push([gameId, game]);
  return game;
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

const sql = mysql.raw;

module.exports = {
  connection,
  newGame,
  newGameFromBot,
  revealTile,
  toggleFlagMine,
  getGameFromPoolOrFromDatabase,
};
