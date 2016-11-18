const expect = require("chai").expect;

const fs = require("fs");
const pcc = require("../src/lib");

describe("PCC", () => {
  describe("mocha test", () => {
    it("should pass", () => {
      expect(5).to.equal(5);
    });
  });
  describe("static analyser", () => {
    describe("properties", () => {
      it("should recognize types from definition", () => {
        let dts = fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8");
        let structure = pcc.parseDTS(dts);
        expect(structure.className).to.equal("InputMath");

        expect(structure.properties).to.deep.equal([
          { name: "HISTORY_SIZE", type: "number", "static": true },
          { name: "SYMBOLS_BASIC", type: "array", "static": true },
          { name: "SYMBOLS_GREEK", type: "array", "static": true },
          { name: "SYMBOLS_PHYSICS", type: "array", "static": true },
          { name: "testValue", type: "boolean" },
          { name: "value", type: "string" },
          { name: "symbols", type: "array" },
          { name: "showSymbols", type: "string" },
          { name: "_history", type: "object", "private": true },
          { name: "_mathField", type: "object", "private": true },
          { name: "_observerLocked", type: "object", "private": true },
          { name: "_freezeHistory", type: "object", "private": true },
          { name: "_editor", type: "object", "private": true }
        ]);

        expect(structure.methods).to.deep.equal([
          { name: "created", type: "void", params: [] },
          { name: "ready", type: "void", params: [] },
          {
            name: "cmd", type: "void", params: [
            { name: "ev", type: "object" }
          ]
          },
          { name: "undo", type: "void", params: [] },
          {
            name: "valueChanged", type: "void", params: [
            { name: "value", type: "string" },
            { name: "prevValue", type: "string" }
          ]
          },
          {
            name: "symbolsChanged", type: "void", params: [
            { name: "symbols", type: "string" }
          ]
          },
          {
            name: "keyShortcuts", type: "void", params: [
            { name: "ev", type: "object" }
          ]
          },
          {
            name: "_updateValue", type: "void", params: [
            { name: "test", type: "boolean" }
          ]
          },
          {
            name: "_updateHistory", type: "void", params: [
            { name: "prevValue", type: "object" }
          ], "private": true
          }
        ]);
      });
    });
  });
});
