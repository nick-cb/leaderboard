const http = require("node:http");

const defaultCors = {
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  "Access-Control-Max-Age": 2592000,
  "Access-Control-Allow-Headers": "Content-Type",
};
/** @param {Partial<typeof defaultCors>} userCors */
function cors(userCors = {}) {
  /**
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse<http.IncomingMessage> & {req: IncomingMessage}} res
   */
  const cors = (req, res) => {
    for (const key in defaultCors) {
      if (userCors[key]) {
        res.setHeader(key, userCors[key]);
      } else {
        res.setHeader(key, defaultCors[key]);
      }
    }
  };

  return cors;
}

function body() {
  /** @param {http.IncomingMessage} req */
  const body = async (req, res) => {
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
    const isFormData =
      contentType === "application/x-www-form-urlencoded" || contentType === "multipart/form-data";
    if (isFormData) {
      data = new URLSearchParams(data);
      const formData = new FormData();
      for (const [key, value] of data) {
        formData.set(key, value);
      }
      req.body = formData;
    }
  };
  return body;
}

function url() {
  /** @param {http.IncomingMessage} req */
  const url = (req, res) => {
    req.parsedUrl = new URL(`http://${process.env.HOST ?? "localhost"}${req.url}`);
  };
  return url;
}

module.exports = { cors, body, url };
