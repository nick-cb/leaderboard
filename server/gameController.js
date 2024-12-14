const { MineSweeper } = require("../minesweeper");
const db = require("./db/db.js");
const { sql, connection, eq, and } = require("./db/db.js");

/** @type {Array<[gameId, MineSweeper]>} gamePools */
const gamePool = [];

/**
 * @param {number} mode
 * @returns {Promise<[number, MineSweeper]>} result
 */
async function newGame({ mode }) {
  const minesweeper = new MineSweeper(16, 16, 40);

  const queryResult = await db.insert("games").values({
    user_id: null,
    start_time: null,
    end_time: null,
    click_count: 0,
    left_click_count: 0,
    right_click_count: 0,
    bv3: minesweeper.calculate3bv(),
    bv3_per_second: 0,
    result: null,
    board: minesweeper.getBoardAsConstantArray(),
    game_mode: 2,
    row_count: minesweeper.rows,
    col_count: minesweeper.cols,
    mine_count: minesweeper.mines,
    efficiency: 0,
    experience: 0,
  });
  if (queryResult[0] && "insertId" in queryResult[0]) {
    const gameId = queryResult[0].insertId;
    await db.insert("cells").values(
      minesweeper.getBoardAsConstantArray().flatMap((row, y) => {
        return row.map((col, x) => {
          return {
            game_id: gameId,
            x: x,
            y: y,
            is_revealed: false,
            is_flagged: false,
            constant: col,
            timestamp: null,
          };
        });
      }),
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
  if (minesweeper.isFinished()) {
    return minesweeper;
  }
  const tiles = minesweeper.revealTile({ x, y });
  if (tiles.length) {
    await db
      .update("cells")
      .set({ is_revealed: true })
      .where(
        and(
          eq("game_id", gameId),
          ...tiles.map((tile) => {
            return and(eq("x", tile.coordinate.x), eq("y", tile.coordinate.y));
          }),
        ),
      );
  }
  await db
    .update("games")
    .set({
      click_count: sql(`click_count+1`),
      left_click_count: sql("left_click_count+1"),
    })
    .where(eq("ID", gameId));
  if (minesweeper.isFinished()) {
    await db
      .update("games")
      .set({ result: minesweeper.isLost || minesweeper.isWon })
      .where(eq("ID", gameId));
  }

  return minesweeper;
}

async function toggleFlagMine(gameId, { x, y }) {
  const minesweeper = await getGameFromPoolOrFromDatabase(gameId);
  if (minesweeper.isFinished()) {
    return minesweeper;
  }
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
  await connection.query(
    sql(`
        update games
        set click_count=click_count+1,right_click_count=right_click_count+1
        where ID=${gameId}
      `).toSqlString(),
  );
  if (minesweeper.isFinished()) {
    await connection.query(
      sql(`
        update games
        set result=${minesweeper.isLost || minesweeper.isWon}
        where ID=${gameId}
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

  const [gameRows, __] = await db
    .select(["row_count", "col_count"])
    .from("games")
    .where(eq("ID", gameId));
  game = gameRows[0];
  if (!game) {
    return null;
  }

  const [cellRows, ___] = await db
    .select(["constant", "x", "y", "is_flagged", "is_revealed"])
    .from("cells")
    .where(eq("game_id", gameId))
    .orderBy({ x: 1, y: 1 });

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

module.exports = {
  newGame,
  newGameFromBot,
  revealTile,
  toggleFlagMine,
  getGameFromPoolOrFromDatabase,
};
