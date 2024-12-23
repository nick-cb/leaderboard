const http = require("node:http");

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

function body() {
  /** @param {http.IncomingMessage} req */
  return async (req, res) => {
    /** @type {Buffer|undefined} data */
    let data;
    for await (const chunk of req) {
      if (!data) {
        data = chunk;
        continue;
      }
      data += data.chunk;
    }
    const contentType = req.headers["content-type"];
    if (contentType === "application/json") {
      req.body = JSON.parse(body.toString());
    }
    if (contentType === "application/x-www-form-urlencoded") {
      const data = new URLSearchParams(body.toString());
      const formData = new FormData();
      for (const [key, value] of data) {
        formData.set(key, value);
      }
      req.body = formData;
    }
  };
}

module.exports = { cors, body };
