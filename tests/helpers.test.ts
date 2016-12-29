import { expect } from "chai";
import { getPropertyNoType, getType, parseParams, buildFieldConfig } from "../src/parsers/DTSParser";
import { goTo, split, findClosing, regExpClosestIndexOf } from "../src/helpers/source-crawlers";
import { arrToObject } from "../src/helpers/misc";
import { buildProperty, buildPropertiesMap } from "../src/PolymerModule";

describe("parser helpers", () => {
  describe("goTo", () => {
    it("should return the index of searched term, omitting all kind of brackets", () => {
      expect(goTo("= 20;", ";", 1)).to.equal(4);
      expect(goTo("= { value: 20 };", ";", 1)).to.equal(15);
      expect(goTo("= () => {let test = 10; return 2 * test;};", ";", 1)).to.equal(41);
      expect(goTo("= () => {let test = 10; return 2 * test;};", /;/, 1)).to.equal(41);
      expect(goTo("= () => {let test = 10; return 2 * test;},", /;|,/, 1)).to.equal(41);
      expect(goTo(`= ";";`, /;|,/, 1)).to.equal(5);
      expect(goTo(`= ';';`, /;|,/, 1)).to.equal(5);
      expect(goTo("= `;`;", /;|,/, 1)).to.equal(5);
      expect(goTo(`= "\\";";`, ";", 1)).to.equal(7);
      expect(goTo(`= "\\";";`, /"/, 1)).to.equal(2);
    });
    it("should return -1 if searched term was not found", () => {
      expect(goTo("() => test() * 2", ";")).to.equal(-1);
      expect(goTo("() => {let test = test(); return test * 2;}", ";")).to.equal(-1);
      expect(goTo("() => {let test = test(); return test * 2;}", /;/)).to.equal(-1);
    });
  });
  describe("split", () => {
    it("should split the string by search pattern, ignoring all kinds of parentheses", () => {
      expect(split("a, b, c", ",")).to.deep.equal([ "a", " b", " c" ]);
      expect(split("a, b, c", ",", true)).to.deep.equal([ "a", "b", "c" ]);
      expect(split("a(b, c), d(e, f)", ",", true)).to.deep.equal([ "a(b, c)", "d(e, f)" ]);
      expect(split("a(b, c), d(e, f)", ",", true)).to.deep.equal([ "a(b, c)", "d(e, f)" ]);
      expect(split("a('b, c'), d('e, f')", ",", true)).to.deep.equal([ "a('b, c')", "d('e, f')" ]);
      expect(split(`a("b, c"), d("e, f")`, ",", true)).to.deep.equal([ `a("b, c")`, `d("e, f")` ]);
    });
  });
  describe("findClosing", () => {
    it("should find the index of a closing bracket", () => {
      expect(findClosing("test(...)", 4, "()")).to.equal(8);
      expect(findClosing("(...)", 0, "()")).to.equal(4);
      expect(findClosing("[...]", 0, "[]")).to.equal(4);
      expect(findClosing("{...}", 0, "{}")).to.equal(4);
      expect(findClosing("<...>", 0, "<>")).to.equal(4);
      expect(findClosing("(.(.).)", 0, "()")).to.equal(6);
      expect(findClosing("(.[.].)", 0, "()")).to.equal(6);
      expect(findClosing("(.[.].)", 0, "()")).to.equal(6);
      expect(findClosing("(.(.).)()", 0, "()")).to.equal(6);
    });
    it("should throw an error if no closing bracket was found", () => {
      expect(() => findClosing("(...", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
      expect(() => findClosing("...", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
      expect(() => findClosing("", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
    });
  });
  describe("regExpClosestIndexOf", () => {
    it("should return index of the first character that matches pattern", () => {
      expect(regExpClosestIndexOf("abc", /a|b|c/, 0)).to.deep.equal({ index: 0, found: "a" });
      expect(regExpClosestIndexOf("abc", /b|c/, 0)).to.deep.equal({ index: 1, found: "b" });
      expect(regExpClosestIndexOf("abc", /c|b/, 0)).to.deep.equal({ index: 1, found: "b" });
    });
    it("should return -1 for index and null for value, if nothing is found", () => {
      expect(regExpClosestIndexOf("def", /b|c/, 0)).to.deep.equal({ index: -1, found: null });
    });
  });
  describe("getPropertyNoType", () => {
    it("should recognize all modifiers and a name", () => {
      expect(getPropertyNoType("prop;")).to.deep.equal({ name: "prop", modifiers: [] });
      expect(getPropertyNoType("readonly prop;")).to.deep.equal({ name: "prop", modifiers: [ "readonly" ] });
      expect(getPropertyNoType("private readonly prop;")).to.deep.equal({
        name: "prop",
        modifiers: [ "private", "readonly" ]
      });
    });

    it("should not exceed char limit", () => {
      let dts = "; readonly prop; test;";
      expect(getPropertyNoType(dts, dts.indexOf("readonly"), dts.indexOf("prop;") + 4)).to.deep.equal({
        name: "prop",
        modifiers: [ "readonly" ]
      });
    });
  });
  describe("getType", () => {
    function testType(type, expected = type, end = type.length) {
      expect(getType(`${type};`)).to.deep.equal({ type: expected, end });
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
      expect(() => getType("{test: boolean;")).to.throw(`Parenthesis has no closing at line 1.`);
    });
  });
  describe("arrToObject", () => {
    it("should create an object using array values as keys", () => {
      expect(arrToObject([])).to.deep.equal({});
      expect(arrToObject([ "a" ])).to.deep.equal({ a: true });
      expect(arrToObject([ "a", "b" ])).to.deep.equal({ a: true, b: true });
    });
    it("should use the value provided in second argument", () => {
      expect(arrToObject([ "a", "b" ], null)).to.deep.equal({ a: null, b: null });
      expect(arrToObject([ "a", "b" ], "yup")).to.deep.equal({ a: "yup", b: "yup" });
    });
  });
  describe("parseParams", () => {
    it("should recognize number of params", () => {
      expect(parseParams("test1").length).to.equal(1);
      expect(parseParams("test1, test2").length).to.equal(2);
      expect(parseParams("test1: number, test2: any").length).to.equal(2);
      expect(parseParams("test1: {a: number; b: any;}, test2: any").length).to.equal(2);
      expect(parseParams("test1: {a: number, b: any;}, test2: any").length).to.equal(2);
    });
    it("should recognise name and type of params", () => {
      expect(parseParams("test1")).to.deep.equal([ { name: "test1" } ]);
      expect(parseParams("test1, test2")).to.deep.equal([ { name: "test1" }, { name: "test2" } ]);
      expect(parseParams("test1: number, test2: any")).to.deep.equal([
        { name: "test1", type: "Number" },
        { name: "test2" }
      ]);
      expect(parseParams("test1: {a: number; b: any;}, test2: any")).to.deep.equal([
        { name: "test1", type: "Object" },
        { name: "test2" }
      ]);
    });
  });
  describe("buildFieldConfig", () => {
    it("should always add name and modifiers", () => {
      let field = buildFieldConfig([ "modifier" ], "name");
      expect(field).to.have.property("modifier");
      expect(field).to.have.property("name");
    });
    it("should have params and type if they are defined", () => {
      let field = buildFieldConfig([ "modifier" ], "name", [ { name: "params" } ], "type");
      expect(field).to.have.property("type");
      expect(field).to.have.property("params");
    });
    it("should NOT add params or type if they are falsy", () => {
      let field = buildFieldConfig([ "modifier" ], "name", null, null);
      expect(field).to.not.have.property("type");
      expect(field).to.not.have.property("params");
    });
  });
  describe("buildPropertiesMap", () => {
    const buildConfigMap = (obj?) => new Map([ [ "test", Object.assign({ name: "test", type: "String" }, obj) ] ]);

    it("should convert field config objects map into a valid Polymer configs map", () => {
      expect(Array.from(buildPropertiesMap(buildConfigMap(), null).values()))
        .to.deep.equal([
        {
          type: "String"
        }
      ]);
    });
    it("should ignore static and private fields", () => {
      // noinspection ReservedWordAsName
      expect(Array.from(buildPropertiesMap(buildConfigMap({ static: true }), null).values()))
        .to.deep.equal([]);
      // noinspection ReservedWordAsName
      expect(Array.from(buildPropertiesMap(buildConfigMap({ private: true }), null).values()))
        .to.deep.equal([]);
    });
  });
  describe("buildProperty", () => {
    it("should build a valid polymer property string", () => {
      expect(buildProperty([
        "test", {
          type: "String",
          value: `"test"`,
          reflectToAttribute: false,
          readOnly: true
        }
      ])).to.equal(`test:{type:String,value:"test",readOnly:true}`);

      expect(buildProperty([
        "test", {
          type: "Custom",
          value: `{test: true}`
        }
      ])).to.equal(`test:{type:Object,value:{test: true}}`);
    });
  });
});
