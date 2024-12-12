const fs = require("fs");
const { fork, spawn } = require("node:child_process");
const { log } = require("./utils/utils");

function watch(args) {
  let script = args[2];
  if (!script && fs.existsSync("./index.js")) {
    script = "index.js";
  }
  const cwd = process.cwd();

  let childProcess = fork(script);

  fs.watch(cwd, { recursive: true }, async (event, filename) => {
    if (filename.includes("node_modules")) {
      return;
    }
    log(`Detect changes in file ${filename}. Restarting the process.`);
    await kill(childProcess.pid, () => {
      log(`Restarted process.`);
      childProcess = fork(script);
    });
  });
  return childProcess;
}

async function kill(pid, callback) {
  console.log(`Killing process ${pid}`);
  const pidList = await getPidList();
  const needToKillPids = pidList.filter(([ppid, _]) => ppid === pid);
  for (const pid of needToKillPids) {
    await kill(pid[1]);
  }
  process.kill(pid);
  async function checkProcessKilled() {
    log.debug("checkProcessKilled");
    const pidList = await getPidList();
    const needToKillPids = pidList.filter(([ppid, _]) => ppid === pid);
    if (needToKillPids.length) {
      console.error(`Cannot kill process ${pid}`);
      return;
    }
    callback?.();
  }
  process.nextTick(checkProcessKilled);
}

async function getPidList() {
  const ps = spawn("ps", ["-A", "-o", "ppid,pid"]);
  /** @type {Promise<Array<[number, number]>>} promise */
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

      resolve(
        data
          .split("\n")
          .map((line, index) => {
            if (index === 0) return false;
            const items = line.split(" ");
            return items
              .map((item) => item.trim())
              .filter((item) => !!item)
              .map((item) => parseInt(item));
          })
          .filter((item) => !!item),
      );
    });
  });

  return promise;
}

module.exports = { watch, getPidList, kill };
