const http = require("node:http");
const gameController = require("./controllers/gameController.js");
const userController = require("./controllers/userController.js");

const server = http.createServer();

server.on("clientError", (err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
  res.setHeader("Access-Control-Max-Age", 2592000);
  res.json = (input) => {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(input));
  };
  const authorization = req.headers.authorization;
  console.log({ authorization });

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

    const [gameId, minesweeper] = await gameController.newGame({ mode });
    res.json({
      id: gameId,
      game: minesweeper.getMaskedBoardAsNumberArray(),
    });
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
    const id = url.pathname.split("/")[2];
    const game = await gameController.revealTile(parseInt(id), {
      x: coordinate[0],
      y: coordinate[1],
    });

    res.json({
      id: id,
      board: game.getMaskedBoardAsNumberArray(),
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
    const game = await gameController.toggleFlagMine(parseInt(id), {
      x: coordinate[0],
      y: coordinate[1],
    });

    res.json({
      id: id,
      board: game.getMaskedBoardAsNumberArray(),
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
      try {
        const result = await gameController.newGameFromBot(data);
        res.json(result);
      } catch (error) {
        res.json({ error: "Failed to insert game to database" });
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
    const game = await gameController.getGameFromPoolOrFromDatabase(id);
    res.json({ gameId: id, board: game.getMaskedBoardAsNumberArray() });
    return;
  }

  if (
    req.method === "POST" &&
    req.headers["content-type"].toLowerCase() === "application/json" &&
    url.pathname === "/login"
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
      try {
        const payload = await userController.login(data);
        res.json(payload);
        return;
      } catch (error) {
        res.json({ error: "Failed to login" });
      }
    });
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

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
