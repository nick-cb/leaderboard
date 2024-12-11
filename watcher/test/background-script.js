const { fork, spawn } = require("child_process");

if (process.send) {
  process.send({ pid: process.pid });
}

spawn(
  'sh',
  [
    '-c',
    `node -e "
      console.log(process.pid, 'is alive')
      setTimeout(() => {
        console.log(process.pid, 'stop')
      }, 10000);
    "`
  ],
  {stdio: ['inherit', 'inherit', 'inherit']}
)
