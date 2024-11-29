const { MineSweeper } = require(".");

server.on("clientError", (err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

const games = [];
server.on("request", (req, res) => {
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
  }

  const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  if (url.pathname === "/game/new") {
    const mode = url.searchParams.get("mode");
    if (!mode) {
      res.json({ error: "Game mode not found" });
      return;
    }
    if (mode !== "intermediate") {
      res.end({ error: "Invalid game mode" });
      return;
    }

    const id = Date.now();
    const minesweeper = new MineSweeper(16, 16, 40);
    games.push([id, minesweeper]);
    minesweeper.initMineSweeper();
    res.json({
      id: id,
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
    const game = games.find(([gameId]) => id == gameId);
    if (!game) {
      res.json({ error: "Invalid game id" });
      return;
    }
    const minesweeper = game[1];
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
    const game = games.find(([gameId]) => id == gameId);
    if (!game) {
      res.json({ error: "Invalid game id" });
      return;
    }
    const minesweeper = game[1];
    minesweeper.toggleFlagMine({ x: coordinate[0], y: coordinate[1] });

    res.json({
      id: id,
      game: minesweeper.getMaskedBoardAsNumberArray(),
    });
    return;
  }

  res.statusCode = 404;
  res.statusMessage = "Not found";
  res.end("Not found");
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
/*
 * - A socket can either be alive or destroyed depended on the "keepAlive" option
   - The "keepAlive" option is not the same as "Connection: keep-alive" header
 * - The server may close the idle connections or refuse multiple requests over same
 connection
 * - Q: What is a socket? What is a connection? How do they relate?
 * 
 */
