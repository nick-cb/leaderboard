const { describe, it } = require("node:test");
const os = require("os");
const assert = require("node:assert");
const { watch } = require("../index.js");
const { spawn } = require("child_process");

describe("watcher background task test", () => {
  it("shouldn't be able to kill child processes's child processes", (_, done) => {
    if (os.platform() !== "linux") {
      done();
      return;
    }
    const childProcess = watch([null, null, "test/background-script.js"]);
    const childProcessPid = childProcess.pid;
    let subprocessPid;
    childProcess.on("spawn", () => {
      const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
      /** @type {string} data */
      let data;
      ps.stdout.on("data", (chunk) => {
        if (!data) {
          data = chunk;
          return;
        }
        data+=chunk;
      });
      ps.stdout.on("end", () => {
        assert.equal(typeof data === "string", true);
        assert.equal(typeof childProcessPid === "number", true);
        assert.equal(data.includes(childProcessPid), true);
      })
    });

    childProcess.on("message", (msg) => {
      subprocessPid = msg.pid;
    });

    setTimeout(() => {
      childProcess.kill();
      const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
      /** @type {string} data */
      let data;
      ps.stdout.on("data", (chunk) => {
        if (!data) {
          data = chunk;
          return;
        }
        data+=chunk;
      });
      ps.stdout.on("end", () => {
        assert.equal(typeof data === "string", true);
        assert.equal(typeof childProcessPid === "number", true);
        assert.equal(data.includes(childProcessPid), false);
        assert.equal(data.includes(subprocessPid), true);
        done();
      });
    }, 3000);
  });
});
