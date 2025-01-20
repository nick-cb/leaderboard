const { AsyncLocalStorage } = require("node:async_hooks");
const http = require("node:http");
const util = require("util");

/*
 * - A socket can either be alive or destroyed depended on the "keepAlive" option
   - The "keepAlive" option is not the same as "Connection: keep-alive" header
 * - The server may close the idle connections or refuse multiple requests over same
 connection
 * - Q: What is a socket? What is a connection? How do they relate?
 * 
 */

/* Stream Api
* - Two modes: 'flowing' and 'pause'
* - Start default in 'pause' mode
* - To change to 'flowing' mode:
    - Add 'data' event handler
    - Calling stream.resume() method
    - Calling stream.pipe() method
* - To switch back to pause mode
    - If there are no pipe, calling stream.pause() method
    - If there are pipes, calling stream.unpipe() method
* - Remove 'data' event handler will NOT automatically pause the stream
* - If there are pipes, calling stream.pause() will not guarantee the stream is
   pause if those pipe is drain and ask for more data
* - Adding a 'readable' event handler automatically make the stream stop flowing
  - Resume flow again when remove 'readable' event
*/

/** @type {AsyncLocalStorage<http.IncomingMessage>} requestStorage */
const requestStorage = new AsyncLocalStorage();

/**
 * @typedef {http.ServerResponse<http.IncomingMessage> & {req: IncomingMessage} & {json: <T>(params: T) => any}} ServerResponse

 * @typedef {http.IncomingMessage & {body: any}} ServerRequest
 */

/**
 * @callback RouteHandlerCallbacks
 * @param {ServerRequest} request
 * @param {ServerResponse} response
 */

class Server {
  /** @type {Array<{method: string, endpoint: string | RegExp, callbacks: (req: ServerRequest, res: ServerResponse) => any}>} */
  routes = [];
  /** @type {Array<{endpoint:string|RegExp,callback:Function}>} */
  middlewares = [];
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
    this.handleNewRequest();
  }

  handleNewRequest() {
    this.#server.on("request", (req, res) => {
      requestStorage.run(req, async () => {
        res.json = (input) => {
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify(input));
        };

        for (const route of this.routes) {
          const isRequestMatch =
            this.isMatchMethod(req, route.method) && this.isMatchEndpoint(req, route.endpoint);
          console.log(route, isRequestMatch);
          if (!isRequestMatch) {
            continue;
          }

          for (const middleware of this.middlewares) {
            if (!this.isMatchEndpoint(req, middleware.endpoint)) {
              continue;
            }
            const result = middleware.callback(req, res);
            if (util.types.isPromise(result)) {
              await result;
            }
          }

          for (const callback of route.callbacks) {
            const result = callback(req, res);
            if (util.types.isPromise(result)) {
              await result;
            }
            return;
          }
        }
      });
    });
  }

  /**
   * @param {string|RegExp} endpoint
   * @param {...RouteHandlerCallbacks} callbacks
   */
  get(endpoint, ...callbacks) {
    this.routes.push({ method: "get", endpoint, callbacks });
  }

  /**
   * @param {string|RegExp} endpoint
   * @param {...RouteHandlerCallbacks} callbacks
   */
  post(endpoint, ...callbacks) {
    this.routes.push({ method: "post", endpoint, callbacks });
  }

  use(endpoint, callback) {
    this.middlewares.push({ endpoint, callback });
  }

  isMatchMethod(req, method) {
    return req.method.toLowerCase() === method;
  }

  isMatchEndpoint(req, endpoint) {
    if (!req.url) {
      return false;
    }
    const url = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
    return typeof endpoint === "string" ? endpoint === url.pathname : endpoint.test(url.pathname);
  }
}

function cookies() {
  const request = requestStorage.getStore();
  if (!request) {
    throw new Error("This function must be call within a request");
  }
  let cookies = request.headers.cookie || "";
  cookies = cookies
    .split("; ")
    .filter(Boolean)
    .map((c) => c.split("="));
  return new URLSearchParams(cookies);
}

module.exports = { Server, cookies };
