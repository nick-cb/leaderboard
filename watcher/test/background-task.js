const { describe, it } = require("node:test");
const os = require("os");
const assert = require("node:assert");
const { watch } = require("../index.js");
const { spawn } = require("child_process");

describe("watcher background task test", () => {
  it("shouldn't be able to kill child processes's child processes", (_, done) => {
    const childProcess = watch([null, null, "test/background-script.js"]);
    const childProcessPid = childProcess.pid;
    let subprocessPid;
    childProcess.on("spawn", () => {
      // const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
      // /** @type {string} data */
      // let data;
      // ps.stdout.on("data", (chunk) => {
      //   if (!data) {
      //     data = chunk;
      //     return;
      //   }
      //   data += chunk;
      // });
      // ps.stdout.on("end", () => {
      //   data = data.toString();
      //   assert.equal(typeof data === "string", true);
      //   assert.equal(typeof childProcessPid === "number", true);
      //   assert.equal(data.includes(childProcessPid), true);
      // });
    });

    childProcess.on("message", (msg) => {
      console.log(childProcessPid, msg)
      // subprocessPid = msg.pid;
      // const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
      // /** @type {string} data */
      // let data;
      // ps.stdout.on("data", (chunk) => {
      //   if (!data) {
      //     data = chunk;
      //     return;
      //   }
      //   data += chunk;
      // });
      // ps.stdout.on("end", () => {
      //   data = data.toString();
      //   console.log(
      //     data.split("\n").filter((line) => line.includes(subprocessPid)),
      //   );
      // });
    });

    setTimeout(() => {
      console.log("killed child process")
      childProcess.kill();
      // childProcess.on("exit", () => {
      //   const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
      //   let data;
      //   ps.stdout.on("data", (chunk) => {
      //     if (!data) {
      //       data = chunk;
      //       return;
      //     }
      //     data += chunk;
      //   });
      //   ps.stdout.on("end", () => {
      //     data = data.toString();
      //     // console.log(
      //     //   data.split("\n").filter((line) => line.includes(subprocessPid)),
      //     // );
      //   });
      // });
      // const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
      // /** @type {string} data */
      // let data;
      // ps.stdout.on("data", (chunk) => {
      //   if (!data) {
      //     data = chunk;
      //     return;
      //   }
      //   data += chunk;
      // });
      // ps.stdout.on("end", () => {
      //   data = data.toString();
      //   assert.equal(typeof data === "string", true);
      //   assert.equal(typeof childProcessPid === "number", true);
      //   assert.equal(data.includes(childProcessPid), false);
      //   if (os.platform() !== "linux") {
      //     // console.log(
      //     //   data.split("\n").filter((line) => line.includes(subprocessPid)),
      //     // );
      //     assert.equal(data.includes(subprocessPid), false);
      //   } else {
      //     assert.equal(data.includes(subprocessPid), true);
      //   }
      //   done();
      // });
    }, 3000);
  });
});
