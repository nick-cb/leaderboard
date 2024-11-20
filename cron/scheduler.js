const { EventEmitter } = require("stream");
const { convertExpressionToConcreteTimes } = require("./expression");

class Scheduler extends EventEmitter {
  #expression;
  #timeout = null;
  #isStop = true;

  constructor(expression) {
    super();
    this.#expression = expression;
  }

  start() {
    this.#isStop = false;
    this.stop();

    const times = convertExpressionToConcreteTimes(this.#expression);
    const [seconds, minutes, hours, doms, months, dows] = times.split(" ");

    const run = () => {
      const now = new Date();
      const second = now.getSeconds();
      const minute = now.getMinutes();
      const hour = now.getHours();
      const dom = now.getDate();
      const month = now.getMonth();
      const dow = now.getDay();
      const isTime =
        seconds.includes(second) &&
        minutes.includes(minute) &&
        hours.includes(hour) &&
        doms.includes(dom) &&
        months.includes(month) &&
        dows.includes(dow);
      if (isTime) {
        this.emit("scheduled-time-matched", { date: now });
      }
      if (!this.#isStop) {
        this.#timeout = setTimeout(run, 1000);
      }
    };

    run();
  }

  stop() {
    if (this.#timeout) {
      clearTimeout(this.#timeout);
      this.#isStop = true;
    }
    this.#timeout = null;
  }
}

module.exports = { Scheduler };
