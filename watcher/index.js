const fs = require("fs");
const { fork, spawn, exec } = require("node:child_process");
const { log } = require("./utils/utils");
const path = require("node:path");

function watch(args) {
  let script = "index.js";
  const execOptionIdx = args.findIndex((option) => option === "--exec");
  const isExec = execOptionIdx !== -1;
  const command = isExec ? args[execOptionIdx + 1] : null;
  const watchOptionIdx = args.findIndex((option) => option === "--watch");
  const isWatch = watchOptionIdx !== -1;
  const pattern = isWatch ? args[watchOptionIdx + 1] : null;

  if (!script && fs.existsSync("./index.js")) {
    script = "index.js";
  }

  let childProcess = fork(script);
  const cwd = process.cwd();
  fs.watch(cwd, { recursive: true }, async (event, filename) => {
    if (filename.includes("node_modules")) {
      return;
    }
    if (pattern && !path.matchesGlob(filename, pattern)) {
      return;
    }
    log(`Detect changes in file ${filename}.`);

    if (!command && script) {
      log("Restarting the process.");
      try {
        childProcess.disconnect();
      } catch (error) {}

      await kill(childProcess.pid, () => {
        log(`Restarted process. ${childProcess.pid}`);
        childProcess = fork(script);
      });
    }
    if (command) {
      log(`Run command '${command}'`);
      exec(command);
    }
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
  try {
    process.kill(pid);
  } catch (error) {
    if (error instanceof Error) {
      if (!error.message.includes("ESRCH")) {
        throw error;
      }
    }
  }
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
