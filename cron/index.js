const { Scheduler } = require("./scheduler");

/**
 * @param {string} expression
 * @param {Function} callback
 */
exports.schedule = function schedule(expression, callback) {
  const scheduler = new Scheduler(expression);
  scheduler.on("scheduled-time-matched", callback);
  scheduler.start();
};
