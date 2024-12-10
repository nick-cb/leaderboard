const { describe, it } = require("node:test");
const { watch } = require("../index.js");
const { spawn } = require("child_process");

describe("watcher background task test", () => {
  it("should be able to kill subprocess's child processes", (_, done) => {
    const childProcess = watch([null, null, "test/background-script.js"]);
    console.log(childProcess.pid)
    let subprocessPid;
    childProcess.on("message", (msg) => {
      subprocessPid = msg;
    });
    setTimeout(() => {
      console.log("kill child process");
      childProcess.kill();
      const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
      ps.stdout.on("data", (msg) => {
        if (Buffer.isBuffer(msg) && subprocessPid.pid) {
          console.log({subprocessPid})
          console.log("include " + subprocessPid.pid + ": " + msg.toString().includes(subprocessPid.pid));
        }
      });
    }, 1000);
  });
});
