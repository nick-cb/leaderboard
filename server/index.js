const http = require("node:http");
const gameController = require("./controllers/gameController.js");
const userController = require("./controllers/userController.js");
const util = require("util");

// const server = http.createServer();

// server.on("clientError", (err, socket) => {
//   socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
// });

// server.on("request", async (req, res) => {
//   res.setHeader("Access-Control-Allow-Credentials", true);
//   res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
//   res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
//   res.setHeader("Access-Control-Max-Age", 2592000);
//   res.json = (input) => {
//     res.setHeader("Content-Type", "application/json");
//     return res.end(JSON.stringify(input));
//   };
//   let cookie = req.headers.cookie || "";
//   cookie = cookie.split("; ").map((c) => c.split("="));
//   const userIdCookie = cookie.find(([key]) => key === "userId");
//   const userId = userIdCookie ? userIdCookie[1] : null;

//   if (!req.url) {
//     res.statusCode = 404;
//     res.statusMessage = "Not found";
//     res.end("Not found");
//     return;
//   }

//   const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
//   if (url.pathname === "/game/new") {
//     const mode = url.searchParams.get("mode");
//     if (!mode) {
//       res.json({ error: "Game mode not found" });
//       return;
//     }
//     if (mode != 2) {
//       res.json({ error: "Invalid game mode" });
//       return;
//     }

//     const [gameId, minesweeper] = await gameController.newGame({ mode });
//     res.json({
//       id: gameId,
//       game: minesweeper.getMaskedBoardAs2DArray(),
//     });
//     return;
//   }

//   if (/\/game\/\d+\/reveal-tile/.test(url.pathname)) {
//     let coordinate = url.searchParams.get("coordinate");
//     if (!coordinate) {
//       res.json({ error: "Please pass in coordinate" });
//       return;
//     }
//     coordinate = coordinate.split(",");
//     if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
//       res.json({
//         error: "Invalid coordinate, the format must be <number>,<number>",
//       });
//       return;
//     }
//     coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
//     const id = url.pathname.split("/")[2];
//     const game = await gameController.revealTile(
//       parseInt(id),
//       parseInt(userId),
//       {
//         x: coordinate[0],
//         y: coordinate[1],
//       },
//     );

//     res.json({
//       id: id,
//       result: game.result,
//       board: game.getMaskedBoardAs2DArray(),
//     });
//     return;
//   }

//   if (/\/game\/\d+\/reveal-adj-tiles/.test(url.pathname)) {
//     let coordinate = url.searchParams.get("coordinate");
//     if (!coordinate) {
//       res.json({ error: "Please pass in coordinate" });
//       return;
//     }
//     coordinate = coordinate.split(",");
//     if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
//       res.json({
//         error: "Invalid coordinate, the format must be <x:number>,<y:number>",
//       });
//       return;
//     }
//     coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];
//     const id = url.pathname.split("/")[2];

//     const game = await gameController.revealAdjTiles(
//       parseInt(id),
//       parseInt(userId),
//       {
//         x: coordinate[0],
//         y: coordinate[1],
//       },
//     );

//     res.json({
//       id: id,
//       result: game.result,
//       board: game.getMaskedBoardAs2DArray(),
//     });
//     return;
//   }

//   if (/\/game\/\d+\/flag-tile/.test(url.pathname)) {
//     let coordinate = url.searchParams.get("coordinate");
//     if (!coordinate) {
//       res.json({ error: "Please pass in coordinate" });
//       return;
//     }
//     coordinate = coordinate.split(",");
//     if (isNaN(coordinate[0]) || isNaN(coordinate[1])) {
//       res.json({
//         error: "Invalid coordinate, the format must be <number>,<number>",
//       });
//       return;
//     }
//     coordinate = [parseInt(coordinate[0]), parseInt(coordinate[1])];

//     const id = url.pathname.split("/")[2];
//     const game = await gameController.toggleFlagMine(parseInt(id), {
//       x: coordinate[0],
//       y: coordinate[1],
//     });

//     res.json({
//       id: id,
//       board: game.getMaskedBoardAs2DArray(),
//     });
//     return;
//   }

//   if (
//     req.method === "POST" &&
//     req.headers["content-type"].toLowerCase() === "application/json" &&
//     url.pathname === "/bot/game/save"
//   ) {
//     let body;
//     req.on("data", (chunk) => {
//       if (!body) {
//         body = chunk;
//         return;
//       }
//       body += chunk;
//     });

//     req.on("end", async () => {
//       if (!Buffer.isBuffer(body)) {
//         res.end("Invalid data type");
//         return;
//       }

//       const data = JSON.parse(body.toString());
//       try {
//         const result = await gameController.newGameFromBot(data);
//         res.json(result);
//       } catch (error) {
//         res.json({ error: "Failed to insert game to database" });
//       }

//       res.json({ error: "Failed to insert game to database" });
//     });
//     return;
//   }

//   if (/\/game\/\d+/.test(url.pathname)) {
//     let id = url.pathname.split("/")[2];
//     if (!id) {
//       res.json({ error: "Game not found" });
//       return;
//     }
//     id = parseInt(id);
//     const game = await gameController.getGameFromPoolOrFromDatabase(id);
//     res.json({
//       gameId: id,
//       result: game.result,
//       board: game.getMaskedBoardAs2DArray(),
//     });
//     return;
//   }

//   if (req.method === "POST" && url.pathname === "/login") {
//     let body;
//     req.on("data", (chunk) => {
//       if (!body) {
//         body = chunk;
//         return;
//       }
//       body += chunk;
//     });
//     req.on("end", async () => {
//       if (!Buffer.isBuffer(body)) {
//         res.end("Invalid data type");
//         return;
//       }
//       const data = new URLSearchParams(body.toString());
//       const username = data.get("username");
//       const password = data.get("password");

//       try {
//         const payload = await userController.login({ username, password });
//         res.statusCode = 302;
//         res.setHeader("Location", "http://localhost:5173/");
//         res.setHeader("Set-Cookie", [`userId=${payload.userId}`, `test=test`]);
//         res.end();
//       } catch (error) {
//         console.log(error);
//         res.json({ error: "Failed to login" });
//       }
//     });
//     return;
//   }

//   res.statusCode = 404;
//   res.statusMessage = "Not found";
//   res.end("Not found");
// });

/**
 * @typedef {ServerResponse<http.IncomingMessage> & {req: IncomingMessage} & {json: <T>(params: T) => any}} Response

 * @typedef {http.IncomingMessage & {body: any}} Request
 */
class Server {
  /** @type {Array<{method: string, endpoint: string | RegExp, callbacks: (req: Request, res: Response) => any}>} */
  #routes = [];
  /** @type {Array<{endpoint:string|RegExp,callback:Function}>} */
  #middlewares = [];
  #server;
  constructor() {
    this.#server = http.createServer();
    const PORT = 8000;

    this.#server.on("clientError", (err, socket) => {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    });
    this.#server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    this.#server.on("request", async (req, res) => {
      res.json = (input) => {
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify(input));
      };
      if (req.method.toLowerCase() === "post") {
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

          if (req.headers["content-type"] === "application/json") {
            req.body = JSON.parse(body.toString());
          }

          if (
            req.headers["content-type"] === "application/x-www-form-urlencoded"
          ) {
            const data = new URLSearchParams(body.toString());
            const formData = new FormData();
            for (const [key, value] of data) {
              formData.set(key, value);
            }
            req.body = formData;
          }

          for (const route of this.#routes) {
            if (!this.isMatchMethod(req, route.method)) {
              continue;
            }
            if (!this.isMatchEndpoint(req, route.endpoint)) {
              continue;
            }
            for (const middleware of this.#middlewares) {
              if (!this.isMatchEndpoint(req, middleware.endpoint)) {
                continue;
              }
              middleware.callback(req, res);
            }
            for (const callback of route.callbacks) {
              const result = callback(req, res);
              await result;
            }
            return;
          }
        });
      } else {
        for (const route of this.#routes) {
          if (!this.isMatchMethod(req, route.method)) {
            continue;
          }
          if (!this.isMatchEndpoint(req, route.endpoint)) {
            continue;
          }
          for (const middleware of this.#middlewares) {
            if (!this.isMatchEndpoint(req, middleware.endpoint)) {
              continue;
            }
            middleware.callback(req, res);
          }
          for (const callback of route.callbacks) {
            const result = callback(req, res);
            await result;
          }
          return;
        }
      }
    });
  }

  /**
   * @param {string|RegExp} endpoint
   * @param {(request: IncomingMessage, response: ServerResponse<http.IncomingMessage> & {req: IncomingMessage;}) => any} callback
   */
  get(endpoint, ...callbacks) {
    this.#routes.push({ method: "get", endpoint, callbacks });
  }

  /**
   * @param {string|RegExp} endpoint
   * @param {(request: IncomingMessage, response: ServerResponse<http.IncomingMessage> & {req: IncomingMessage;}) => any} callbacks
   */
  post(endpoint, ...callbacks) {
    this.#routes.push({ method: "post", endpoint, callbacks });
  }

  use(endpoint, callback) {
    this.#middlewares.push({ endpoint, callback });
  }

  isMatchMethod(req, method) {
    return req.method.toLowerCase() === method;
  }

  isMatchEndpoint(req, endpoint) {
    if (!req.url) {
      return false;
    }
    const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
    return typeof endpoint === "string"
      ? endpoint === url.pathname
      : endpoint.test(url.pathname);
  }
}

/**
 * @param {http.IncomingMessage} req
 * @param {Response} res
 */
function cors() {
  return (_, res) => {
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
    res.setHeader("Access-Control-Max-Age", 2592000);
  };
}

/*
 * - A socket can either be alive or destroyed depended on the "keepAlive" option
   - The "keepAlive" option is not the same as "Connection: keep-alive" header
 * - The server may close the idle connections or refuse multiple requests over same
 connection
 * - Q: What is a socket? What is a connection? How do they relate?
 * 
 */

// const PORT = 8000;
// server.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });

const server = new Server();

server.use(/.*/, cors());

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
  let cookie = req.headers.cookie || "";
  cookie = cookie.split("; ").map((c) => c.split("="));
  const userIdCookie = cookie.find(([key]) => key === "userId");
  const userId = userIdCookie ? userIdCookie[1] : null;

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
  });
});

server.get(/\/game\/\d+\/reveal-adj-tiles/, async (req, res) => {
  let cookie = req.headers.cookie || "";
  cookie = cookie.split("; ").map((c) => c.split("="));
  const userIdCookie = cookie.find(([key]) => key === "userId");
  const userId = userIdCookie ? userIdCookie[1] : null;

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

  const game = await gameController.revealAdjTiles(
    parseInt(id),
    parseInt(userId),
    {
      x: coordinate[0],
      y: coordinate[1],
    },
  );

  return res.json({
    id: id,
    result: game.result,
    board: game.getMaskedBoardAs2DArray(),
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
    board: game.getMaskedBoardAs2DArray(),
  });
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
    console.log(body);
    if (!(body instanceof FormData)) {
      throw new Error("Invalid data type");
    }
    const payload = await userController.login({
      username: body.get("username"),
      password: body.get("password"),
    });
    res.statusCode = 302;
    res.setHeader("Location", "http://localhost:5173/");
    res.setHeader("Set-Cookie", [`userId=${payload.userId}`, `test=test`]);
    res.end();
  } catch (error) {
    console.log(error);
    res.json({ error: "Failed to login" });
  }
});
