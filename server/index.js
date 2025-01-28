const gameController = require("./controllers/gameController.js");
const userController = require("./controllers/userController.js");
const { body, cors, url } = require("./middewares.js");
const { Server, cookies } = require("./server.js");

const server = new Server();

server.use(/.*/, body());
server.use(/.*/, cors({ "Access-Control-Allow-Origin": "http://localhost:3000" }));
server.use(/.*/, url());

server.get("/game/new", async (req, res) => {
  const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  const mode = url.searchParams.get("mode");
  if (!mode) {
    return res.json({ error: "Game mode not found" });
  }
  if (mode != 2) {
    return res.json({ error: "Invalid game mode" });
  }

  const [gameId, minesweeper] = await gameController.newGame({ mode });
  return res.json({
    id: gameId,
    game: minesweeper.getMaskedBoardAs2DArray(),
  });
});

server.get(/\/game\/\d+\/reveal-tile/, async (req, res) => {
  const userId = cookies().get("userId");

  const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  let coordinate = url.searchParams.get("coordinate");
  if (!coordinate) {
    return res.json({ error: "Please pass in coordinate" });
  }
  coordinate = coordinate.split(",");
  if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
    return res.json({
      error: "Invalid coordinate, the format must be <number>,<number>",
    });
  }
  coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
  const id = url.pathname.split("/")[2];
  const game = await gameController.revealTile(parseInt(id), parseInt(userId), {
    x: coordinate[0],
    y: coordinate[1],
  });

  return res.json({
    id: id,
    result: game.result,
    board: game.getMaskedBoardAs2DArray(),
    isRunning: game.isFinished() ? false : !!game.startTime,
  });
});

server.get(/\/game\/\d+\/reveal-adj-tiles/, async (req, res) => {
  const userId = cookies().get("userId");

  const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  let coordinate = url.searchParams.get("coordinate");
  if (!coordinate) {
    return res.json({ error: "Please pass in coordinate" });
  }
  coordinate = coordinate.split(",");
  if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
    return res.json({
      error: "Invalid coordinate, the format must be <x:number>,<y:number>",
    });
  }
  coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
  const id = url.pathname.split("/")[2];

  const game = await gameController.revealAdjTiles(parseInt(id), parseInt(userId), {
    x: coordinate[0],
    y: coordinate[1],
  });

  return res.json({
    id: id,
    result: game.result,
    board: game.getMaskedBoardAs2DArray(),
    isRunning: game.isFinished() ? false : !!game.startTime,
  });
});

server.get(/\/game\/\d+\/flag-tile/, async (req, res) => {
  const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  let coordinate = url.searchParams.get("coordinate");
  if (!coordinate) {
    return res.json({ error: "Please pass in coordinate" });
  }
  coordinate = coordinate.split(",");
  if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
    return res.json({
      error: "Invalid coordinate, the format must be <number>,<number>",
    });
  }
  coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];

  const id = url.pathname.split("/")[2];
  const game = await gameController.toggleFlagMine(parseInt(id), {
    x: coordinate[0],
    y: coordinate[1],
  });

  return res.json({
    id: id,
    result: game.result,
    board: game.getMaskedBoardAs2DArray(),
    isRunning: game.isFinished() ? false : !!game.startTime,
  });
});

server.get(/\/game\/\d+\/action-logs/, async (req, res) => {
  try {
    const id = req.parsedUrl.pathname.split("/")[2];
    const userId = cookies().get("userId");

    const logs = await gameController.getActionLogs(id, userId);
    res.json(logs);
  } catch (error) {
    console.log(error);
    return res.json({ error: error.message });
  }
});

server.get(/\/game\/\d+/, async (req, res) => {
  const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  let id = url.pathname.split("/")[2];
  if (!id) {
    return res.json({ error: "Game not found" });
  }
  id = parseInt(id);
  const game = await gameController.getGameFromPoolOrFromDatabase(id);
  return res.json({
    gameId: id,
    result: game.result,
    board: game.getMaskedBoardAs2DArray(),
  });
});

server.post("/bot/game/save", async (req, res) => {
  try {
    const result = await gameController.newGameFromBot(req.body);
    res.json(result);
  } catch (error) {
    res.json({ error: "Failed to insert game to database" });
  }
});

server.post("/login", async (req, res) => {
  try {
    const body = req.body;
    if (!(body instanceof FormData)) {
      throw new Error("Invalid data type");
    }

    const payload = await userController.login({
      username: body.get("username"),
      password: body.get("password"),
    });
    res.statusCode = 302;
    res.setHeader("Location", "http://localhost:3000/");
    res.setHeader("Set-Cookie", [`userId=${payload.userId}`, `test=test`]);
    res.end("success");
  } catch (error) {
    console.log(error);
    res.json({ error: "Failed to login" });
  }
});

server.post("/$sudo/finish-game", async (req, res) => {
  try {
    const body = req.body;
    console.log({ body });
    const gameId = body.gameId;
    const result = body.result;
    if (cookies().get("userId") != 4) {
      return res.end("Not found");
    }

    await gameController.sudoFinishGame(gameId, { result });
    res.end("success");
  } catch (error) {
    console.log(error);
    return res.end("Not found");
  }
});

server.post(/\/game\/\d+\/log-action/, async (req, res) => {
  try {
    const body = req.body;
    const action = body.action; // mouseup
    const coordinate = body.coordinate;
    const timestamp = body.timestamp;
    const id = req.parsedUrl.pathname.split("/")[2];
    const userId = cookies().get("userId");

    await gameController.logUserAction(parseInt(id), userId, {
      x: coordinate.x,
      y: coordinate.y,
      action,
      timestamp,
    });

    res.json({ result: "success" });
  } catch (error) {
    console.log(error);
    return res.json({ error: error.message });
  }
});
