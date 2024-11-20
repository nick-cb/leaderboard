/** @param {string} expression */
exports.convertExpressionToConcreteTimes =
  function convertExpressionToConcreteTimes(expression) {
    const parts = expression.split(" ");

    const isNotIncludeSecond = parts.length === 5;
    if (isNotIncludeSecond) {
      parts.unshift("");
    }

    const second = convertPatternsToConcreteTimes(parts[0], [0, 59]);
    const minute = convertPatternsToConcreteTimes(parts[1], [0, 59]);
    const hour = convertPatternsToConcreteTimes(parts[2], [0, 23]);
    const dom = convertPatternsToConcreteTimes(parts[3], [1, 31]);
    const month = convertPatternsToConcreteTimes(parts[4], [0, 11]);
    const dow = convertPatternsToConcreteTimes(parts[5], [1, 7]);

    return [second, minute, hour, dom, month, dow].join(" ").trim();
  };

/**
 * @param {string} pattern
 * @param {[number, number]} range
 * @param {number} skip
 */
function convertPatternsToConcreteTimes(pattern, range) {
  if (!pattern) {
    return "";
  }
  const parts = pattern.split(",");

  let result = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i !== 0) {
      result += ",";
    }
    result += convertRange(
      convertStep(convertAsterisk(convertSingleValue(part), range), range),
      range,
    );
  }

  return result;
}

/**
 * @param {string} pattern
 * @param {[number, number]} range
 * @param {number} skip
 */
function convertAsterisk(pattern, range) {
  if (pattern !== "*") {
    return pattern;
  }

  return expandRangeToTimeValues(range);
}

/**
 * @param {string} pattern
 * @param {[number, number]} range
 */
function convertStep(pattern, range) {
  const parts = pattern.split("/");
  const isStep = parts.length > 1;
  if (!isStep) {
    return pattern;
  }
  if (parts[0] === "*" && isNaN(parts[1])) {
    throw new Error("Invalid expression");
  }

  const skip = parseInt(parts[1]);
  return expandRangeToTimeValues(range, skip);
}

/**
 * @param {string} pattern
 */
function convertRange(pattern) {
  const parts = pattern.split("-");
  const isRange = parts.length > 1;
  if (!isRange) {
    return pattern;
  }

  if (isNaN(parts[0]) || isNaN(parts[1])) {
    throw new Error("Invalid expression");
  }

  const range = [parseInt(parts[0]), parseInt(parts[1])];
  return expandRangeToTimeValues(range);
}

/**
 * @param {string} pattern
 */
function convertSingleValue(pattern) {
  if (isNaN(pattern)) {
    return pattern;
  }

  return parseInt(pattern).toString();
}

/**
 * @param {[number, number]} range
 * @param {number} skip
 */
function expandRangeToTimeValues(range, skip = 1) {
  if (isNaN(range[0]) || isNaN(range[1]) || isNaN(skip)) {
    throw new Error("Invalid expression");
  }

  let result = "";
  for (let i = range[0]; i <= range[1]; i += skip) {
    if (i !== range[0]) {
      result += ",";
    }
    result += i;
  }
  return result;
}
