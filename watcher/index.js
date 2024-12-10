const fs = require("fs");
const { fork } = require("child_process");

function watch(args) {
  let script = args[2];
  if (!script && fs.existsSync("./index.js")) {
    script = "index.js";
  }
  const cwd = process.cwd();

  let childProcess = fork(script);
  fs.watch(cwd, { recursive: true }, (event, filename) => {
    if (filename.includes("node_modules")) {
      return;
    }
    childProcess.kill();
    childProcess = fork(script);
  });
  return childProcess;
}

module.exports = { watch };
