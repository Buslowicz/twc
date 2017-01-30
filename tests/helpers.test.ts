import { expect } from "chai";
import { goTo, split, findClosing, regExpClosestIndexOf } from "../src/helpers/source-crawlers";
import { arrToObject, type2js } from "../src/helpers/misc";
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
  describe("get", () => {
    // TODO
  });
  describe("nonEmpty", () => {
    // TODO
  });
  describe("stripJSDoc", () => {
    // TODO
  });
  describe("wrapJSDoc", () => {
    // TODO
  });
  describe("findDocComment", () => {
    // TODO
  });
  describe("type2js", () => {
    it("should parse TS type to valid JS type", () => {
      expect(type2js("string")).to.equal("String");
      expect(type2js("number")).to.equal("Number");
      expect(type2js("boolean")).to.equal("Boolean");
      expect(type2js("Date")).to.equal("Date");
      expect(type2js("User")).to.equal("User");
      expect(type2js("null")).to.equal(null);
      expect(type2js("undefined")).to.equal(null);
      expect(type2js("number|boolean")).to.equal("Object");
      expect(type2js("{a: boolean}")).to.equal("Object");
      expect(type2js("any|{a: boolean}")).to.equal("Object");
      expect(type2js("{a: boolean}|any")).to.equal("Object");
      expect(type2js("Array<string>")).to.equal("Array");
      expect(type2js("[string]")).to.equal("Array");
      expect(type2js("string[]")).to.equal("Array");
    });
    function testType(type, expected = type) {
      expect(type2js(`${type}`)).to.deep.equal(expected);
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
      expect(() => type2js("{test: boolean")).to.throw(`Parenthesis has no closing at line 1.`);
    });
  });
});
