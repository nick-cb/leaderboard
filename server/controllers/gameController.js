const { MineSweeper } = require("../../minesweeper/index.js");
const db = require("../db/db.js");
const { sql, eq, and, or } = require("../../query-builder/index.js");

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
    start_time: new Date(),
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
  const queryResult = await db.insert("games").values({
    user_id: data.userId,
    start_time: data.startTime,
    end_time: data.endTime,
    click_count: data.clicks,
    left_click_count: data.leftClicks,
    right_click_count: data.rightClicks,
    bv3: data.bv3,
    bv3_per_second: data.bv3PerSecond,
    result: data.result,
    board: data.board.flatMap((row) => row).join(","),
    game_mode: 2,
    row_count: data.rows,
    col_count: data.cols,
    mine_count: data.mines,
    efficiency: 0,
    experience: 0,
  });

  if (queryResult[0] && "insertId" in queryResult[0]) {
    const gameId = queryResult[0].insertId;
    await db.insert("cells").values(
      data.trail.map((trail) => {
        const x = trail.coordinate[0];
        const y = trail.coordinate[1];
        return {
          game_id: gameId,
          x: x,
          y: y,
          is_revealed: trail.type === "uncovered",
          is_flagged: trail.type === "is_flagged",
          constant: data.board[y][x],
          timestamp: new Date(trail.timestamp),
        };
      }),
    );

    return { gameId };
  }

  throw new Error("Failed to insert game to database");
}

async function revealTile(gameId, userId, { x, y }) {
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
          or(
            ...tiles.map((tile) =>
              and(eq("x", tile.coordinate.x), eq("y", tile.coordinate.y)),
            ),
          ),
        ),
      );
    await db
      .update("games")
      .set({
        click_count: sql`click_count+1`,
        left_click_count: sql`left_click_count+1`,
        result: minesweeper.isLost || minesweeper.isWon || null,
        score: minesweeper.isFinished() ? calculateScore(userId) : sql`score`,
        end_time: minesweeper.isFinished()
          ? minesweeper.endTime
          : sql`end_time`,
        // best_time: sql`case when ${minesweeper.isWon} then least(best_time, ${minesweeper.endTime}-start_time) else best_time`,
      })
      .where(eq("ID", gameId));
    if (minesweeper.isFinished()) {
      const time = minesweeper.endTime - minesweeper.startTime;
      const [userRow] = await db
        .select(["win_streak_mode2", "best_time_mode2", "total_wins_mode2"])
        .from("users")
        .where(eq("user_id", userId));
      const user = userRow[0];
      const bestTime = !user.best_time_mode2
        ? time
        : Math.min(user.best_time_mode2, time);
      await db
        .update("users")
        .set({
          best_time_mode2: sql`ifnull(${time}, if(${minesweeper.isWon()},least(${time},'best_time_mode2'),'best_time_mode2'))`,
        })
        .where(eq("user_id", userId));
    }
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
    await db
      .update("cells")
      .set({ is_flagged: true })
      .where(
        sql`game_id=${gameId} and (x=${tile.coordinate.x} and y=${tile.coordinate.y})`,
      );
  }
  await db
    .update("games")
    .set({
      click_count: sql`click_count+1`,
      right_click_count: sql`right_click_count+1`,
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

async function getGameFromPoolOrFromDatabase(gameId) {
  let [_, game] = gamePool.find((g) => g[0] === gameId) || [];
  if (game) {
    return game;
  }

  const [gameRows, __] = await db
    .select(["row_count", "col_count", "result", "start_time", "end_time"])
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

  const startTime = game.startTime;
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
  game.startTime = startTime;

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
async function calculateScore(userId) {
  const [userRow] = await db
    .select(["win_streak", "best_time", "win_count"])
    .from("users")
    .where(eq("user_id", userId));
  const user = userRow[0];

  /* - win score
   * - time score
   * - mastery: number of wins out of 100 games
   */

  return (
    calculateWinStreakScore({ winStreak: user.win_streak }) +
    calculateBestTimeScore({ bestTime: user.best_time }) +
    calculateMasteryScore({ winCount: user.win_count })
  );
}

function calculateWinStreakScore({ winStreak }) {
  for (const [key, value] of Object.entries(scores[0].wsScore)) {
    if (value == winStreak) {
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