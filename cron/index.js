const { Scheduler } = require("./scheduler");

exports.schedule = function schedule(expression, callback) {
  const scheduler = new Scheduler(expression);
  scheduler.on("scheduled-time-matched", runCallback(callback));
  scheduler.start();
};

function runCallback(callback) {
  return () => {
    try {
      callback();
    } catch (error) {
      console.log(error);
    }
  };
}
