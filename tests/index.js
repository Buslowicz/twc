const expect = require("chai").expect;

const fs = require("fs");
const pcc = require("../src/lib");

describe("PCC", () => {
  describe("static analyser", () => {
    describe("findClosing", () => {
      it("should find the index of a closing bracket", () => {
        expect(pcc.findClosing("test(...)", 4, "()")).to.equal(8);
        expect(pcc.findClosing("(...)", 0, "()")).to.equal(4);
        expect(pcc.findClosing("[...]", 0, "[]")).to.equal(4);
        expect(pcc.findClosing("{...}", 0, "{}")).to.equal(4);
        expect(pcc.findClosing("<...>", 0, "<>")).to.equal(4);
        expect(pcc.findClosing("(.(.).)", 0, "()")).to.equal(6);
        expect(pcc.findClosing("(.[.].)", 0, "()")).to.equal(6);
        expect(pcc.findClosing("(.[.].)", 0, "()")).to.equal(6);
        expect(pcc.findClosing("(.(.).)()", 0, "()")).to.equal(6);
      });
      it("should return -1 if no closing bracket was found", () => {
        expect(pcc.findClosing("(...", 0, "()")).to.equal(-1);
        expect(pcc.findClosing("...", 0, "()")).to.equal(-1);
        expect(pcc.findClosing("", 0, "()")).to.equal(-1);
      });
    });
    describe("regExpClosestIndexOf", () => {
      it("should return index of the first character that matches pattern", () => {
        expect(pcc.regExpClosestIndexOf("abc", 0, /a|b|c/)).to.deep.equal({ index: 0, found: "a" });
        expect(pcc.regExpClosestIndexOf("abc", 0, /b|c/)).to.deep.equal({ index: 1, found: "b" });
        expect(pcc.regExpClosestIndexOf("abc", 0, /c|b/)).to.deep.equal({ index: 1, found: "b" });
      });
      it("should return -1 for index and null for value, if nothing is found", () => {
        expect(pcc.regExpClosestIndexOf("def", 0, /b|c/)).to.deep.equal({ index: -1, found: null });
      });
    });
    describe("regExpIndexOf", () => {
      it("should return index of the first character that matches pattern", () => {
        expect(pcc.regExpIndexOf("abc", 0, /a|b|c/)).to.equal(0);
        expect(pcc.regExpIndexOf("abc", 0, /b|c/)).to.equal(1);
        expect(pcc.regExpIndexOf("abc", 0, /c|b/)).to.equal(1);
      });
      it("should return -1 if nothing is found", () => {
        expect(pcc.regExpIndexOf("def", 0, /b|c/)).to.equal(-1);
      });
    });
    describe("getPropertyNoType", () => {
      it("should recognize all modifiers and a name", () => {
        expect(pcc.getPropertyNoType("prop;")).to.deep.equal({ name: "prop", modifiers: [] });
        expect(pcc.getPropertyNoType("readonly prop;")).to.deep.equal({ name: "prop", modifiers: [ "readonly" ] });
        expect(pcc.getPropertyNoType("private readonly prop;")).to.deep.equal({
          name: "prop",
          modifiers: [ "private", "readonly" ]
        });
      });

      it("should not exceed char limit", () => {
        let dts = "; readonly prop; test;";
        expect(pcc.getPropertyNoType(dts, dts.indexOf("readonly"), dts.indexOf("prop;") + 4)).to.deep.equal({
          name: "prop",
          modifiers: [ "readonly" ]
        });
      });
    });
    describe("getType", () => {
      function testSimple(type, expected = type, end = type.length) {
        expect(pcc.getType(`${type};`)).to.deep.equal({ type: expected, end });
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
      it("should return type null and index -1 if there was an error parsing the template", () => {
        testSimple("{test: boolean", null, -1);
      });
    });
    describe("arrToObject", () => {
      it("should create an object using array values as keys", () => {
        expect(pcc.arrToObject([])).to.deep.equal({});
        expect(pcc.arrToObject([ "a" ])).to.deep.equal({ a: true });
        expect(pcc.arrToObject([ "a", "b" ])).to.deep.equal({ a: true, b: true });
      });
      it("should use the value provided in second argument", () => {
        expect(pcc.arrToObject([ "a", "b" ], null)).to.deep.equal({ a: null, b: null });
        expect(pcc.arrToObject([ "a", "b" ], "yup")).to.deep.equal({ a: "yup", b: "yup" });
      });
    });
    describe("parseParams", () => {
      it("should recognize number of params", () => {
        expect(pcc.parseParams("test1").length).to.equal(1);
        expect(pcc.parseParams("test1, test2").length).to.equal(2);
        expect(pcc.parseParams("test1: number, test2: any").length).to.equal(2);
        expect(pcc.parseParams("test1: {a: number; b: any;}, test2: any").length).to.equal(2);
        expect(pcc.parseParams("test1: {a: number, b: any;}, test2: any").length).to.equal(2);
      });
      it("should recognice name and type of params", () => {
        expect(pcc.parseParams("test1")).to.deep.equal([ { name: "test1" } ]);
        expect(pcc.parseParams("test1, test2")).to.deep.equal([ { name: "test1" }, { name: "test2" } ]);
        expect(pcc.parseParams("test1: number, test2: any")).to.deep.equal([
          { name: "test1", type: "Number" },
          { name: "test2" }
        ]);
        expect(pcc.parseParams("test1: {a: number; b: any;}, test2: any")).to.deep.equal([
          { name: "test1", type: "Object" },
          { name: "test2" }
        ]);
      });
    });
    describe("parseDTS", () => {
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
