const http = require("node:http");
const { MineSweeper } = require(".");

const server = http.createServer();

server.on("clientError", (err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

const games = [];
server.on("request", (req, res) => {
  if (req.url) {
    const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
    if (url.pathname === "/game/new") {
      const mode = url.searchParams.get("mode");
      if (!mode) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin":
            "*" /* @dev First, read about security */,
          "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
          "Access-Control-Max-Age": 2592000, // 30 days
          /** add other headers as per requirement */
        });
        res.end(
          JSON.stringify({
            error: "Game mode not found",
          }),
        );
        return;
      }
      if (mode !== "intermediate") {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin":
            "*" /* @dev First, read about security */,
          "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
          "Access-Control-Max-Age": 2592000, // 30 days
          /** add other headers as per requirement */
        });
        res.end(
          JSON.stringify({
            error: "Invalid game mode",
          }),
        );
        return;
      }

      const id = Date.now();
      const minesweeper = new MineSweeper(16, 16, 40);
      games.push([id, minesweeper]);
      minesweeper.initMineSweeper();
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin":
          "*" /* @dev First, read about security */,
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        "Access-Control-Max-Age": 2592000, // 30 days
        /** add other headers as per requirement */
      });
      res.end(
        JSON.stringify({
          id: id,
          game: minesweeper.getMaskedBoardAsNumberArray(),
        }),
      );
      return;
    }

    if (/\/game\/\d+\/reveal-tile/.test(url.pathname)) {
      let coordinate = url.searchParams.get("coordinate");
      if (!coordinate) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Please pass in coordinate",
          }),
        );
        return;
      }
      coordinate = coordinate.split(",");
      if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Invalid coordinate, the format must be <number>,<number>",
          }),
        );
        return;
      }
      coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];

      const id = url.pathname.split("/")[2];
      const game = games.find(([gameId]) => id == gameId);
      if (!game) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Invalid game id",
          }),
        );
        return;
      }
      const minesweeper = game[1];
      minesweeper.revealTile({ x: coordinate[0], y: coordinate[1] });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: id,
          game: minesweeper.getMaskedBoardAsNumberArray(),
        }),
      );
      return;
    }
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      hello: "world",
    }),
  );
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
