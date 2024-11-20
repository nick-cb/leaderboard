// TODO: Add more tests

const { equal } = require("node:assert");
const { describe, it } = require("node:test");
const { convertExpressionToConcreteTimes } = require("../expression");

describe("asterisk syntax conversion", () => {
  it("should convert * to concrete times", () => {
    const second =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59";
    const minute =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59";
    const hour =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23";
    const dom =
      "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31";
    const month = "0,1,2,3,4,5,6,7,8,9,10,11";
    const dow = "1,2,3,4,5,6,7";

    let expression = "* * * * *";
    equal(
      [minute, hour, dom, month, dow].join(" "),
      convertExpressionToConcreteTimes(expression),
    );

    expression = "* * * * * *";
    equal(
      [second, minute, hour, dom, month, dow].join(" "),
      convertExpressionToConcreteTimes(expression),
    );
  });
});

describe("step syntax conversion", () => {
  it("should convert step syntax */10 to concrete times", () => {
    const second = "0,10,20,30,40,50";
    const minute =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59";
    const hour =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23";
    const dom =
      "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31";
    const month = "0,1,2,3,4,5,6,7,8,9,10,11";
    const dow = "1,2,3,4,5,6,7";

    let expression = "*/10 * * * * *";
    equal(
      [second, minute, hour, dom, month, dow].join(" "),
      convertExpressionToConcreteTimes(expression),
    );
  });
});

describe("range syntax conversion", () => {
  it("should convert range syntax 09-18 to concrete times", () => {
    const second = "0";
    const minute = "9,10,11,12,13,14,15,16,17,18";
    const hour =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23";
    const dom =
      "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31";
    const month = "0,1,2,3,4,5,6,7,8,9,10,11";
    const dow = "1,2,3,4,5,6,7";

    let expression = "0 09-18 * * * *";
    equal(
      [second, minute, hour, dom, month, dow].join(" "),
      convertExpressionToConcreteTimes(expression),
    );
  });
});

describe("multiple instance syntax conversion", () => {
  it("should convert multiple instance syntax 11-16 to concrete times", () => {
    const second = "0";
    const minute = "11,16";
    const hour =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23";
    const dom =
      "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31";
    const month = "0,1,2,3,4,5,6,7,8,9,10,11";
    const dow = "1,2,3,4,5,6,7";

    let expression = "0 11,16 * * * *";
    equal(
      [second, minute, hour, dom, month, dow].join(" "),
      convertExpressionToConcreteTimes(expression),
    );
  });

  it("should convert multiple instance syntax with range 11-14,16 to concrete times", () => {
    const second = "0";
    const minute = "11,12,13,14,16";
    const hour =
      "0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23";
    const dom =
      "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31";
    const month = "0,1,2,3,4,5,6,7,8,9,10,11";
    const dow = "1,2,3,4,5,6,7";

    let expression = "0 11-14,16 * * * *";
    equal(
      [second, minute, hour, dom, month, dow].join(" "),
      convertExpressionToConcreteTimes(expression),
    );
  });
});
