const expect = require("chai").expect;

const fs = require("fs");
const pcc = require("../src/lib");

describe("PCC", () => {
  describe("static analyser", () => {
    describe("findSemicolon", () => {
      it("should get position of semicolon in simple declaration", () => {
        expect(pcc.getTypes("test: number;")).to.equal(12);
        expect(pcc.getTypes("readonly test: number;")).to.equal(21);
      });
      it("should get position of semicolon in complex types", () => {
        expect(pcc.getTypes("test: Promise<string>;")).to.equal(21);
        expect(pcc.getTypes("test: string[];")).to.equal(14);
        expect(pcc.getTypes("test: [string];")).to.equal(14);
        expect(pcc.getTypes("test: {test: boolean};")).to.equal(21);
      });
      it("should ignore semicolons inside objects", () => {
        expect(pcc.getTypes("test: {a: string; b: number};")).to.equal(28);
        expect(pcc.getTypes("test: {a: string; b: number;};")).to.equal(29);
        expect(pcc.getTypes("test: Promise<{a: string; b: number;}>;")).to.equal(38);
      });
    });
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
//        testSimple("string[][]", "array");  FIXME: end
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
        testSimple("string|number", "Object");
      });
      it("should recognize fixed string values");
    });
    describe("parser", () => {
      it("should recognize types from definition", () => {
        let dts = fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8");
        let structure = pcc.parseDTS(dts);
        expect(structure.className).to.equal("InputMath");

        expect(structure.properties).to.deep.equal([
          { name: "HISTORY_SIZE", type: "number", "static": true },
          { name: "SYMBOLS_BASIC", type: "array", "static": true },
          { name: "SYMBOLS_GREEK", type: "array", "static": true },
          { name: "SYMBOLS_PHYSICS", type: "array", "static": true },
          { name: "testValue", type: "string" },
          { name: "value", type: "string" },
          { name: "symbols", type: "array" },
          { name: "showSymbols", type: "string" },
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
            type: "array",
            params: [
              { name: "value", type: "string" },
              { name: "prevValue", type: "string" }
            ]
          },
          {
            name: "symbolsChanged",
            type: "void",
            params: [
              { name: "symbols", type: "string" }
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
              { name: "test", type: "object" }
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
