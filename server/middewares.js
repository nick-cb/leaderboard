const http = require("node:http");

const defaultCors = {
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  "Access-Control-Max-Age": 2592000,
};
/** @param {Partial<typeof defaultCors>} userCors */
function cors(userCors) {
  /**
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse<http.IncomingMessage> & {req: IncomingMessage}} res
   */
  return (req, res) => {
    for (const key in defaultCors) {
      if (userCors[key]) {
        res.setHeader(key, userCors[key]);
      } else {
        res.setHeader(key, defaultCors[key]);
      }
    }
    // res.setHeader("Access-Control-Allow-Credentials", true);
    // res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    // res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
    // res.setHeader("Access-Control-Max-Age", 2592000);
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
    if (!data) {
      return;
    }

    data = data.toString();
    const contentType = req.headers["content-type"];
    if (contentType === "application/json") {
      req.body = JSON.parse(data);
    }
    if (contentType === "application/x-www-form-urlencoded") {
      data = new URLSearchParams(data);
      const formData = new FormData();
      for (const [key, value] of data) {
        formData.set(key, value);
      }
      req.body = formData;
    }
  };
}

module.exports = { cors, body };
