require("chai").should();

const fs = require("fs");
const pcc = require("../src/lib");

describe("PCC", () => {
  describe("mocha test", () => {
    it("should pass", () => {
      (5).should.equal(5);
    });
  });
  describe("static analyser", () => {
    describe("properties", () => {
      it("should recognize types from definition", () => {
        let dts = fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8");
        console.log(JSON.stringify(pcc.parseDTS(dts), null, 2));
      });
    });
  });
});
