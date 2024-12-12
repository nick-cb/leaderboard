const util = require("util");

function log(...message) {
  console.log(util.styleText("green", ...message));
}

function debug(...message) {
  if (process.env.NODE_ENV !== "dev") {
    return;
  }

  console.log(...message);
}

log.debug = debug;

module.exports = { log };
