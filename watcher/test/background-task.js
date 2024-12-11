const { describe, it } = require("node:test");
const util = require("node:util");
const os = require("os");
const assert = require("node:assert");
const { watch } = require("../index.js");
const { spawn } = require("child_process");

describe("watcher background task test", () => {
  it("shouldn't be able to kill child processes's child processes", (_, done) => {
    const childProcess = watch([null, null, "test/background-script.js"]);
    childProcess.on("spawn", async () => {
      const pidList = await getPidList();
      assert.equal(typeof pidList === "string", true);
      assert.equal(typeof childProcess.pid === "number", true);
      assert.equal(pidList.includes(childProcess.pid), true);
    });

    let childProcessSubProcessPid;
    childProcess.on("message", (msg) => {
      console.log({ msg });
      if (typeof msg === "object") {
        childProcessSubProcessPid = msg.subPid;
      }
    });

    setTimeout(() => {
      console.log("killed child process");
      childProcess.kill();
      childProcess.on("exit", async () => {
        const pidList = await getPidList();
        assert.equal(typeof pidList === "string", true);
        assert.equal(typeof childProcess.pid === "number", true);
        assert.equal(pidList.includes(childProcess.pid), false);
        assert.equal(pidList.includes(childProcessSubProcessPid), true);
        done();
      });
    }, 3000);
  });
});

async function getPidList() {
  const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
  /** @type {Promise<string>} promise */
  const promise = await new Promise((resolve) => {
    /** @type {string} data */
    let data;
    ps.stdout.on("data", (chunk) => {
      if (!data) {
        data = chunk;
        return;
      }
      data += chunk;
    });
    ps.stdout.on("end", () => {
      data = data.toString();
      resolve(data);
    });
  });

  return promise;
}
