const mongoose = require("mongoose");

const Trail = new mongoose.Schema({
  coordinate: {
    type: [Number, Number],
  },
  type: String,
});

const StatSchema = new mongoose.Schema({
  userId: Number,
  startTime: Number,
  endTime: Number,
  trail: {
    type: [Trail],
  },
  clicks: Number,
  leftClick: Number,
  rightClick: Number,
  bv3: Number,
  bv3PerSecond: Number,
});

const Stats = mongoose.model("Stats", StatSchema);

module.exports = { Stats };
