const expect = require("chai").expect;

const fs = require("fs");
const pcc = require("../src/lib");

describe("PCC", () => {
  describe("static analyser", () => {
    describe("typeRecognizer", () => {
      function testSimple(type, expected = type) {
        expect(pcc.getType(`${type};`)).to.deep.equal({type: expected, end: type.length});
      }
      it("should recognize simple type", () => {
        testSimple("number", "Number");
        testSimple("string", "String");
        testSimple("object", "Object");
        testSimple("User");
      });
      it("should recognize arrays", () => {
        testSimple("Array<string>", "Array");
        testSimple("string[]", "Array");
        testSimple("[string]", "Array");
        testSimple("string[][]", "Array");
      });
      it("should recognize types with generics", () => {
        testSimple("Promise<string>", "Promise");
        testSimple("Promise<>", "Promise");
        testSimple("Promise<Promise<null>>", "Promise");
      });
      it("should recognize inline objects", () => {
        testSimple("{next: () => any}", "Object");
        testSimple("{a: any; b: number;}", "Object");
        testSimple(`{test: "true"|"false"}`, "Object");
        testSimple("{test: {deep: boolean}}", "Object");
      });
      it("should recognize combined types", () => {
        testSimple("string|null", "String");
        testSimple("string | null", "String");
        testSimple("string|number", "Object");
        testSimple("string | number", "Object");
      });
      it("should recognize fixed string values", () => {
          testSimple(`"yep"`, "String");
          testSimple(`"yep"|"nope"`, "String");
          testSimple(`"yep" | "nope"`, "String");
      });
    });
    describe("parser", () => {
      it("should recognize types from definition", () => {
        let dts = fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8");
        let structure = pcc.parseDTS(dts);
        expect(structure.className).to.equal("InputMath");

        expect(structure.properties).to.deep.equal([
          { name: "HISTORY_SIZE", type: "Number", "static": true },
          { name: "SYMBOLS_BASIC", type: "Array", "static": true },
          { name: "SYMBOLS_GREEK", type: "Array", "static": true },
          { name: "SYMBOLS_PHYSICS", type: "Array", "static": true },
          { name: "testValue", type: "String" },
          { name: "value", type: "String" },
          { name: "symbols", type: "Array" },
          { name: "showSymbols", type: "String" },
          { name: "_history", "private": true },
          { name: "_mathField", "private": true },
          { name: "_observerLocked", "private": true },
          { name: "_freezeHistory", "private": true },
          { name: "_editor", "private": true }
        ]);

        expect(structure.methods).to.deep.equal([
          {
            name: "created",
            type: "void",
            params: []
          },
          {
            name: "ready",
            type: "void",
            params: []
          },
          {
            name: "cmd",
            type: "void",
            params: [
              { name: "ev", type: "PolymerEvent" }
            ]
          },
          {
            name: "undo",
            type: "void",
            params: []
          },
          {
            name: "valueChanged",
            type: "Array",
            params: [
              { name: "value", type: "String" },
              { name: "prevValue", type: "String" }
            ]
          },
          {
            name: "symbolsChanged",
            type: "void",
            params: [
              { name: "symbols", type: "String" }
            ]
          },
          {
            name: "keyShortcuts",
            type: "void",
            params: [
              { name: "ev", type: "KeyboardEvent" }
            ]
          },
          {
            name: "_updateValue",
            type: "void",
            params: [
              { name: "test", type: "Object" }
            ]
          },
          {
            name: "_updateHistory",
            params: [
              { name: "prevValue" }
            ],
            "private": true
          }
        ]);
      });
    });
  });
});
