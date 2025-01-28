const { MineSweeper } = require("../../minesweeper/index.js");
const db = require("../db/db.js");
const { sql, eq, and, or } = require("../../query-builder/index.js");
const scores = require("../scores.json");

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
    board: minesweeper.getBoardAs2DArray(),
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
      minesweeper.getBoardAs2DArray().flatMap((row, y) => {
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
    minesweeper.ID = gameId;
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
    await Promise.allSettled(
      tiles.map((tile) => {
        return db
          .update("cells")
          .set({ is_revealed: true, timestamp: new Date(tile.timestamp) })
          .where(and(eq("game_id", gameId), eq("x", tile.x), eq("y", tile.y)));
      }),
    );
    await db
      .update("games")
      .set({
        click_count: sql`click_count+1`,
        left_click_count: sql`left_click_count+1`,
        result: minesweeper.result ?? null,
        end_time: minesweeper.isFinished() ? new Date(minesweeper.endTime) : sql`end_time`,
      })
      .where(eq("ID", gameId));
    if (minesweeper.isFinished() && minesweeper.result === 1) {
      await updateUserScore(userId, minesweeper);
    }
  }

  return minesweeper;
}

async function revealAdjTiles(gameId, userId, { x, y }) {
  const minesweeper = await getGameFromPoolOrFromDatabase(gameId);
  if (minesweeper.isFinished()) {
    return minesweeper;
  }
  const tiles = minesweeper.revealAdjTiles({ x, y });
  if (tiles.length) {
    await Promise.allSettled(
      tiles.map((tile) => {
        return db
          .update("cells")
          .set({ is_revealed: true, timestamp: new Date(tile.timestamp) })
          .where(and(eq("game_id", gameId), eq("x", tile.x), eq("y", tile.y)));
      }),
    );
    // await db
    //   .update("cells")
    //   .set({ is_revealed: true })
    //   .where(
    //     and(
    //       eq("game_id", gameId),
    //       or(...tiles.map((tile) => and(eq("x", tile.x), eq("y", tile.y)))),
    //     ),
    //   );
    await db
      .update("games")
      .set({
        click_count: sql`click_count+1`,
        left_click_count: sql`left_click_count+1`,
        result: minesweeper.result ?? null,
        end_time: minesweeper.isFinished() ? new Date(minesweeper.endTime) : sql`end_time`,
      })
      .where(eq("ID", gameId));
    if (minesweeper.isFinished() && minesweeper.result === 1) {
      await updateUserScore(userId, minesweeper);
    }
  }

  return minesweeper;
}

async function toggleFlagMine(gameId, { x, y }) {
  const minesweeper = await getGameFromPoolOrFromDatabase(gameId);
  if (minesweeper.isFinished()) {
    return minesweeper;
  }
  const tile = minesweeper.toggleFlagTile({ x, y });
  if (tile) {
    await db
      .update("cells")
      .set({ is_flagged: true, timestamp: new Date(tile.timestamp) })
      .where(and(eq("game_id", gameId), eq("x", tile.x), eq("y", tile.y)));
    // await db
    //   .update("cells")
    //   .set({ is_flagged: true })
    //   .where(sql`game_id=${gameId} and (x=${tile.x} and y=${tile.y})`);
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

async function sudoFinishGame(gameId, { result }) {
  const minesweeper = await getGameFromPoolOrFromDatabase(gameId);
  if (minesweeper.isFinished()) {
    return minesweeper;
  }

  if (result === 1) {
    for (let y = 0; y < minesweeper.rows; y++) {
      for (let x = 0; x < minesweeper.cols; x++) {
        const tile = minesweeper.board[y][x];
        if (tile.isRevealable() && tile.constant < 9) {
          minesweeper.revealTile({ x: tile.x, y: tile.y });
        }
      }
    }
  }

  if (result === 0) {
    for (let y = 0; y < minesweeper.rows; y++) {
      for (let x = 0; x < minesweeper.cols; x++) {
        const tile = minesweeper.board[y][x];
        if (tile.constant === 9) {
          minesweeper.revealTile({ x: tile.x, y: tile.y });
          break;
        }
      }
    }
  }

  if (minesweeper.isFinished() && minesweeper.result === 1) {
    await updateUserScore(4, minesweeper);
  }

  return minesweeper;
}

async function logUserAction(gameId, userId, { x, y, action, timestamp }) {
  await db.insert("user_action_log").values({
    user_id: userId,
    game_id: gameId,
    action,
    x,
    y,
    timestamp: new Date(timestamp),
  });
}

async function getActionLogs(gameId, userId) {
  const game = await getGameFromPoolOrFromDatabase(gameId);
  console.log(game);
  if (!game) throw new Error("Not found game");
  const logs = await db
    .select(["ID", "action", "x", "y", "timestamp"])
    .from("user_action_log")
    .where(and(eq("game_id", gameId), eq("user_id", userId)));

  return {
    gameId: game.ID,
    duration: game.endTime - game.startTime,
    logs: logs[0],
  };
}

async function getGameFromPoolOrFromDatabase(gameId) {
  let [_, game] = gamePool.find((g) => g[0] === gameId) || [];
  if (game) {
    return game;
  }

  const [gameRows] = await db
    .select(["row_count", "col_count", "result", "start_time", "end_time", "result"])
    .from("games")
    .where(eq("ID", gameId));
  game = gameRows[0];
  if (!game) return null;
  const [cellRows, ___] = await db
    .select(["constant", "x", "y", "is_flagged", "is_revealed"])
    .from("cells")
    .where(eq("game_id", gameId))
    .orderBy({ x: 1, y: 1 });

  const minesweeper = MineSweeper.from({
    rows: game.row_count,
    cols: game.col_count,
    tiles: cellRows.map((cell) => ({
      x: cell.x,
      y: cell.y,
      constant: cell.constant,
      isFlagged: !!parseInt(cell.is_flagged.toString()),
      isRevealed: !!parseInt(cell.is_revealed.toString()),
    })),
  });
  minesweeper.ID = game.ID;
  minesweeper.startTime = game.start_time;
  minesweeper.endTime = game.end_time;
  minesweeper.result = game.result;

  gamePool.push([gameId, minesweeper]);
  return minesweeper;
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

/**
 * @param {number} userId
 * @param {MineSweeper} minesweeper
 */
async function updateUserScore(userId, minesweeper) {
  const [userRow] = await db
    .select(["win_streak_mode2", "best_win_streak_mode2", "best_time_mode2", "total_wins_mode2"])
    .from("users")
    .where(eq("ID", userId));
  const user = userRow[0];
  const time = minesweeper.endTime - minesweeper.startTime;
  const bestTime = !user.best_time_mode2 ? time : Math.min(user.best_time_mode2, time);
  const winStreak = Math.max(user.win_streak_mode2 + 1, user.best_win_streak_mode2);
  const winCount = user.total_wins_mode2 + 1;

  const score =
    calculateWinStreakScore({ winStreak }) +
    calculateBestTimeScore({ bestTime }) +
    calculateMasteryScore({ winCount });

  await db
    .update("users")
    .set({
      trophies: score,
      // best_win_streak_mode2: bestTime,
      // best_time_mode2: winStreak,
      // total_wins_mode2: winCount,
    })
    .where(eq("ID", userId));
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
      console.log({ i, bestTime, time });
      return parseInt(score);
    }
    if (bestTime > time) {
      console.log({ i, bestTime, time, score: timeScores[i], previousScore: timeScores[i - 1] });
      const [_, previousTime] = timeScores[i - 1];
      const timeDiff = (time - previousTime) / 10;
      const slowerBy = Math.round(bestTime - time);
      return score - Math.round(slowerBy / timeDiff);
    }
  }
  return 0;
}

function calculateMasteryScore({ winCount }) {
  return scores[0].winsScore[winCount];
}

module.exports = {
  newGame,
  newGameFromBot,
  revealTile,
  revealAdjTiles,
  toggleFlagMine,
  getGameFromPoolOrFromDatabase,
  sudoFinishGame,
  logUserAction,
  getActionLogs,
};
