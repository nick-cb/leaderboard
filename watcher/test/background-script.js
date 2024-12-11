const { spawn } = require("child_process");

// if (process.send) {
//   process.send({ pid: process.pid });
// }

const childProcess = spawn(
  "sh",
  [
    "-c",
    `node -e "
      console.log(process.pid, 'is alive')
      setTimeout(() => {
        console.log(process.pid, 'stop')
      }, 20000);
    "`,
  ],
  // { stdio: ["inherit", "inherit", "inherit"] },
);

childProcess.stdout.on("data", (chunk) => {
  const data = chunk.toString();
  const pid = data.split(" ");
  process.send({ subPid: parseInt(pid[0]) });
});
