const expect = require("chai").expect;

const fs = require("fs");
const pcc = require("../src/lib");

describe("PCC", () => {
  describe("static analyser", () => {
    describe("goTo", () => {
      it("should return the index of searched term, omitting all kind of brackets", () => {
        expect(pcc.goTo("= 20;", ";", 1)).to.equal(4);
        expect(pcc.goTo("= { value: 20 };", ";", 1)).to.equal(15);
        expect(pcc.goTo("= () => {let test = 10; return 2 * test;};", ";", 1)).to.equal(41);
        expect(pcc.goTo("= () => {let test = 10; return 2 * test;};", /;/, 1)).to.equal(41);
        expect(pcc.goTo("= () => {let test = 10; return 2 * test;},", /;|,/, 1)).to.equal(41);
        expect(pcc.goTo(`= ";";`, /;|,/, 1)).to.equal(5);
        expect(pcc.goTo(`= ';';`, /;|,/, 1)).to.equal(5);
        expect(pcc.goTo("= `;`;", /;|,/, 1)).to.equal(5);
        expect(pcc.goTo(`= "\\";";`, ";", 1)).to.equal(7);
        expect(pcc.goTo(`= "\\";";`, /"/, 1)).to.equal(2);
      });
      it("should return -1 if searched term was not found", () => {
        expect(pcc.goTo("() => test() * 2", ";")).to.equal(-1);
        expect(pcc.goTo("() => {let test = test(); return test * 2;}", ";")).to.equal(-1);
        expect(pcc.goTo("() => {let test = test(); return test * 2;}", /;/)).to.equal(-1);
      });
    });
    describe("split", () => {
      it("should split the string by search pattern, ignoring all kinds of parentheses", () => {
        expect(pcc.split("a, b, c", ",")).to.deep.equal([ "a", " b", " c" ]);
        expect(pcc.split("a, b, c", ",", true)).to.deep.equal([ "a", "b", "c" ]);
        expect(pcc.split("a(b, c), d(e, f)", ",", true)).to.deep.equal([ "a(b, c)", "d(e, f)" ]);
        expect(pcc.split("a(b, c), d(e, f)", ",", true)).to.deep.equal([ "a(b, c)", "d(e, f)" ]);
        expect(pcc.split("a('b, c'), d('e, f')", ",", true)).to.deep.equal([ "a('b, c')", "d('e, f')" ]);
        expect(pcc.split(`a("b, c"), d("e, f")`, ",", true)).to.deep.equal([ `a("b, c")`, `d("e, f")` ]);
      });
    });
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
      it("should throw an error if no closing bracket was found", () => {
        expect(() => pcc.findClosing("(...", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
        expect(() => pcc.findClosing("...", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
        expect(() => pcc.findClosing("", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
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
      function testType(type, expected = type, end = type.length) {
        expect(pcc.getType(`${type};`)).to.deep.equal({ type: expected, end });
      }

      it("should recognize simple type", () => {
        testType("number", "Number");
        testType("string", "String");
        testType("object", "Object");
        testType("User");
      });
      it("should recognize arrays", () => {
        testType("Array<string>", "Array");
        testType("string[]", "Array");
        testType("[string]", "Array");
        testType("string[][]", "Array");
      });
      it("should recognize types with generics", () => {
        testType("Promise<string>", "Promise");
        testType("Promise<>", "Promise");
        testType("Promise<Promise<null>>", "Promise");
      });
      it("should recognize inline objects", () => {
        testType("{next: () => any}", "Object");
        testType("{a: any; b: number;}", "Object");
        testType(`{test: "true"|"false"}`, "Object");
        testType("{test: {deep: boolean}}", "Object");
      });
      it("should recognize combined types", () => {
        testType("string|null", "String");
        testType("string | null", "String");
        testType("string|number", "Object");
        testType("string | number", "Object");
      });
      it("should recognize fixed string values", () => {
        testType(`"yep"`, "String");
        testType(`"yep"|"nope"`, "String");
        testType(`"yep" | "nope"`, "String");
      });
      it("should throw a syntax error if there was an error parsing the template", () => {
        expect(() => pcc.getType("{test: boolean;")).to.throw(`Parenthesis has no closing at line 1.`);
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
    describe("buildField", () => {
      it("should always add name and modifiers", () => {
        let field = pcc.buildField([ "modifier" ], "name");
        expect(field).to.have.property("modifier");
        expect(field).to.have.property("name");
      });
      it("should have params and type if they are defined", () => {
        let field = pcc.buildField([ "modifier" ], "name", "params", "type");
        expect(field).to.have.property("type");
        expect(field).to.have.property("params");
      });
      it("should NOT add params or type if they are falsy", () => {
        let field = pcc.buildField([ "modifier" ], "name", null, null);
        expect(field).to.not.have.property("type");
        expect(field).to.not.have.property("params");
      });
    });
    describe("getParamsData", () => {
      it("should return index of parenthesis close index and params details", () => {
        expect(pcc.getParamsData("(test1: {a: number, b: any;}, test2: any)", 0)).to.deep.equal({
          closeIndex: 40,
          params: [
            { name: "test1", type: "Object" },
            { name: "test2", type: "any" }
          ]
        });
      });
      it("should throw and error if parenthesis is not closed", () => {
        expect(() => pcc.getParamsData("(test1: any")).to.throw(`Parenthesis has no closing at line 1.`);
        let classDefinition = `class Test {
  test1(test1: any);
  test2(test2: any;
}`;
        expect(() => pcc.getParamsData(classDefinition, classDefinition.indexOf("test2(") + 5))
          .to.throw(`Parenthesis has no closing at line 3.`);
      });
    });
    describe("parseDTS", () => {
      let meta;

      before(() => {
        meta = pcc.parseDTS(fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8"));
      });

      it("should recognize types from definition", () => {
        expect(meta.className).to.equal("InputMath");

        expect(meta.properties).to.deep.equal([
          { name: "HISTORY_SIZE", type: "Number", "static": true },
          { name: "SYMBOLS_BASIC", type: "Array", "static": true },
          { name: "SYMBOLS_GREEK", type: "Array", "static": true },
          { name: "SYMBOLS_PHYSICS", type: "Array", "static": true },
          { name: "testValue", type: "String" },
          { name: "value", type: "String" },
          { name: "symbols", type: "Array" },
          { name: "showSymbols", type: "String" },
          { name: "fn", type: "Function" },
          { name: "_history", "private": true },
          { name: "_mathField", "private": true },
          { name: "_observerLocked", "private": true },
          { name: "_freezeHistory", "private": true },
          { name: "_editor", "private": true }
        ]);

        expect(meta.methods).to.deep.equal([
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
    describe("parseJS", () => {
      let meta;

      before(() => {
        meta = pcc.parseJS(
          fs.readFileSync(`${__dirname}/assets/input-math.js`, "utf8"),
          pcc.parseDTS(fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8")),
          { definedAnnotations: [ "test", "test2" ] }
        );
      });

      it("should fetch default values from parsed constructor", () => {
        expect(meta.values).to.deep.equal({
          value: `""`,
          fn: "() => typeof window",
          _observerLocked: "false",
          _freezeHistory: "false"
        });
      });
      it("should fetch decorators for all properties and methods", () => {
        let { decorators } = meta;
        expect(decorators).to.have.property("value");
        expect(decorators).to.have.property("symbols");
        expect(decorators).to.have.property("showSymbols");
        expect(decorators).to.have.property("valueChanged");
        expect(decorators).to.have.property("symbolsChanged");
        expect(decorators).to.have.property("keyShortcuts");
      });
      it("should fetch list of decorators used per field", () => {
        let { decorators: { value, symbols, showSymbols, valueChanged, symbolsChanged, keyShortcuts } } = meta;

        expect(value).to.include("property");
        expect(symbols).to.include("property");
        expect(showSymbols).to.include("property");
        expect(valueChanged).to.include("observe");
        expect(symbolsChanged).to.include("observe");
        expect(keyShortcuts).to.include("listen");
      });
      it("should exclude annotations from decorators list", () => {
        let { decorators: { value } } = meta;
        expect(value).to.not.include("test");
      });
      it("should fetch list of annotations used per field", () => {
        let { annotations: { value, symbols } } = meta;

        let valueAnnotation = value[ 0 ];

        expect(valueAnnotation.name).to.equal("test");
        expect(valueAnnotation.params).to.equal(undefined);

        let symbolsAnnotation = symbols[ 0 ];

        expect(symbolsAnnotation.name).to.equal("test2");
        expect(symbolsAnnotation.params).to.equal("5");
      });
    });
  });
});
