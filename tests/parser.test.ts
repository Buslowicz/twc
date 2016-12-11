import { expect } from "chai";
import { readFileSync } from "fs";
import { parseDTS, parseJS } from "../src/parser";
import { goTo, split, findClosing, regExpClosestIndexOf } from "../src/helpers/source-crawlers";
import { getPropertyNoType, getType, parseParams } from "../src/ts-parsers";
import { buildField } from "../src/code-builders";
import { arrToObject } from "../src/helpers/misc";

describe("static analyser", () => {
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
    it("should recognice name and type of params", () => {
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
  describe("buildField", () => {
    it("should always add name and modifiers", () => {
      let field = buildField([ "modifier" ], "name");
      expect(field).to.have.property("modifier");
      expect(field).to.have.property("name");
    });
    it("should have params and type if they are defined", () => {
      let field = buildField([ "modifier" ], "name", [ { name: "params" } ], "type");
      expect(field).to.have.property("type");
      expect(field).to.have.property("params");
    });
    it("should NOT add params or type if they are falsy", () => {
      let field = buildField([ "modifier" ], "name", null, null);
      expect(field).to.not.have.property("type");
      expect(field).to.not.have.property("params");
    });
  });
  describe("parseDTS", () => {
    let meta;
    let deprecatedCallbacksDTS;

    before(() => {
      meta = parseDTS(readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8"));
      deprecatedCallbacksDTS = readFileSync(`${__dirname}/assets/deprecated-callbacks.d.ts`, "utf8");
    });

    it("should throw an error if deprecated lifecycle callback is used", () => {
      expect(() => parseDTS(
        deprecatedCallbacksDTS
      )).to.throw("`created` callback is deprecated. Please use `constructor` instead");

      expect(() => parseDTS(
        deprecatedCallbacksDTS
          .replace(/created/, "constructor")
      )).to.throw("`attached` callback is deprecated. Please use `connectedCallback` instead");

      expect(() => parseDTS(
        deprecatedCallbacksDTS
          .replace(/created/, "constructor")
          .replace(/attached/, "connectedCallback")
      )).to.throw("`detached` callback is deprecated. Please use `disconnectedCallback` instead");

      expect(() => parseDTS(
        deprecatedCallbacksDTS
          .replace(/created/, "constructor")
          .replace(/attached/, "connectedCallback")
          .replace(/detached/, "disconnectedCallback")
      )).to.throw("`attributeChanged` callback is deprecated. Please use `attributeChangedCallback` instead");

      expect(() => parseDTS(
        deprecatedCallbacksDTS
          .replace(/created/, "constructor")
          .replace(/attached/, "connectedCallback")
          .replace(/detached/, "disconnectedCallback")
          .replace(/attributeChanged/, "attributeChangedCallback")
      )).to.not.throw(Error);
    });
    it("should recognize types from definition", () => {
      expect(meta.className).to.equal("InputMath");

      expect(Array.from(meta.properties.values())).to.deep.equal([
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

      expect(Array.from(meta.methods.values())).to.deep.equal([
        {
          name: "constructor",
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
    let complexMeta: JSParsedData;
    let complexDTSData: DTSParsedData;

    let simpleMeta: JSParsedData;
    let simpleDTSData: DTSParsedData;

    before(() => {
      complexDTSData = parseDTS(readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8"));
      complexMeta = parseJS(readFileSync(`${__dirname}/assets/input-math.js`, "utf8"), complexDTSData);

      simpleDTSData = parseDTS(readFileSync(`${__dirname}/assets/element-name.d.ts`, "utf8"));
      simpleMeta = parseJS(readFileSync(`${__dirname}/assets/element-name.js`, "utf8"), simpleDTSData);
    });

    it("should fetch additional generated class name", () => {
      expect(complexMeta.generatedName).to.be.oneOf([ "InputMath_1", undefined ]);
    });
    it("should fetch constructor body if it was defined in TS file, otherwise it should be skipped", () => {
      expect(simpleDTSData.methods.get("constructor")).to.equal(undefined);
      expect(complexDTSData.methods.get("constructor")).to.not.equal(undefined);
      expect(complexDTSData.methods.get("constructor").body).to.not.equal(undefined);
    });
    it("should fetch default values from parsed constructor", () => {
      expect(complexDTSData.properties.get("value").value).to.equal(`""`);
      expect(complexDTSData.properties.get("fn").value).to.equal("function () { return typeof window; }");
      expect(complexDTSData.properties.get("_observerLocked").value).to.equal("false");
      expect(complexDTSData.properties.get("_freezeHistory").value).to.equal("false");
      expect(complexDTSData.properties.get("_editor").value).to.equal("document.createElement(\"div\")");
    });
    it("should fetch list of decorators used per field", () => {
      let { methods, properties } = complexDTSData;

      expect(properties.get("value").decorators).to.have.deep.property("0.name", "property");
      expect(properties.get("symbols").decorators).to.have.deep.property("0.name", "property");
      expect(properties.get("showSymbols").decorators).to.have.deep.property("0.name", "property");
      expect(methods.get("keyShortcuts").decorators).to.have.deep.property("0.name", "listen");
    });
    it("should fetch list of annotations used per field", () => {
      let { properties, methods } = complexDTSData;

      expect(properties.get("value").annotations).to.have.deep.property("0.name", "attr");
      expect(properties.get("value").annotations).to.have.deep.property("0.params", undefined);

      expect(properties.get("symbols").annotations).to.have.deep.property("0.name", "notify");
      expect(properties.get("symbols").annotations).to.have.deep.property("0.params", undefined);

      expect(methods.get("valueChanged").annotations).to.have.deep.property("0.name", "observe");
      expect(methods.get("valueChanged").annotations).to.have.deep.property("0.params", `"value"`);

      expect(methods.get("symbolsChanged").annotations).to.have.deep.property("0.name", "observe");
      expect(methods.get("symbolsChanged").annotations).to.have.deep.property("0.params", `"showSymbols"`);
    });
    it("should fetch decorators for class", () => {
      expect(complexMeta.decorators).to.have.length(1);
    });
    it("should fetch list of class decorators", () => {
      let classDecorators = complexMeta.decorators;
      expect(classDecorators).to.have.deep.property("0.name", "component");
    });
    it("should exclude annotations from class decorators list", () => {
      let classDecorators = complexMeta.decorators;
      expect(classDecorators).to.not.have.deep.property("0.name", "template");
    });
    it("should fetch annotations for class", () => {
      let classAnnotation = complexMeta.annotations;

      expect(classAnnotation).to.have.deep.property("0.name", "template");
      expect(classAnnotation).to.have.deep.property("0.params", `"<input>"`);
    });
    it("should fetch method bodies", () => {
      let methods = complexDTSData.methods;
      expect(Array.from(methods.keys())).to.deep.equal([
        "constructor", "ready", "cmd", "undo", "valueChanged",
        "symbolsChanged", "keyShortcuts", "_updateValue", "_updateHistory"
      ]);
      expect(methods.get("constructor").body)
        .to.be.oneOf([
        [
          "() {",
          "        super();",
          "        var editor = this._editor;",
          "        editor.id = \"editor\";",
          "        editor.classList.add(this.is);",
          "        this._mathField = MathQuill.getInterface(2).MathField(editor, {",
          "            spaceBehavesLikeTab: true,", '            handlers: {',
          "                edit: this._updateValue.bind(this)",
          "            }",
          "        });",
          "    }"
        ].join("\n"),
        [
          "() {",
          "        var _this = _super.call(this) || this;",
          "        var editor = _this._editor;",
          "        editor.id = \"editor\";",
          "        editor.classList.add(_this.is);",
          "        _this._mathField = MathQuill.getInterface(2).MathField(editor, {",
          "            spaceBehavesLikeTab: true,",
          "            handlers: {",
          "                edit: _this._updateValue.bind(_this)",
          "            }",
          "        });",
          "        return _this;",
          "    }"
        ].join("\n")
      ]);
      expect(methods.get("ready").body)
        .to
        .equal([
          "() {",
          "        this.insertBefore(this._editor, this.$.controls);",
          "    }"
        ].join("\n"));
      expect(methods.get("cmd").body)
        .to
        .equal([
          "(ev) {",
          "        this._mathField.cmd(ev.model.item.cmd).focus();",
          "    }"
        ].join("\n"));
      expect(methods.get("undo").body)
        .to
        .equal([
          "() {",
          "        if (this._history && this._history.length > 0) {",
          "            this._freezeHistory = true;",
          "            this.value = this._history.pop();",
          "            this._freezeHistory = false;",
          "        }",
          "    }"
        ].join("\n"));
      expect(methods.get("valueChanged").body)
        .to
        .equal([
          "(value, prevValue) {",
          "        this._updateHistory(prevValue);",
          "        if (this._observerLocked) {",
          "            return;",
          "        }",
          "        this._mathField.select().write(value);",
          "        if (this._mathField.latex() === \"\") {",
          "            this.undo();",
          "        }",
          "    }"
        ].join("\n"));
      expect(methods.get("symbolsChanged").body
        .replace(/InputMath_1/, "InputMath")
        .replace(/groupName => {/, "function (groupName) {"))
        .to
        .equal([
          "(symbols) {",
          "        if (symbols) {",
          "            this.symbols = symbols.split(\",\").map(function (groupName) {",
          "                return InputMath[\"SYMBOLS_\" + groupName.toUpperCase()] || [];",
          "            });",
          "        }",
          "    }"
        ].join("\n"));
      expect(methods.get("keyShortcuts").body)
        .to
        .equal([
          "(ev) {",
          "        if (ev.ctrlKey && ev.keyCode === 90) {",
          "            this.undo();",
          "        }",
          "    }"
        ].join("\n"));
      expect(methods.get("_updateValue").body)
        .to
        .equal([
          "(test) {",
          "        console.log(test);",
          "        this._observerLocked = true;",
          "        this.value = this._mathField.latex();",
          "        this._observerLocked = false;",
          "    }"
        ].join("\n"));
      expect(methods.get("_updateHistory").body.replace(/InputMath_1/, "InputMath"))
        .to
        .equal([
          "(prevValue) {",
          "        if (!this._history) {",
          "            this._history = [];",
          "        }",
          "        if (this._freezeHistory || prevValue == null) {",
          "            return;",
          "        }",
          "        this._history.push(prevValue);",
          "        if (this._history.length > InputMath.HISTORY_SIZE) {",
          "            this._history.shift();",
          "        }",
          "    }"
        ].join("\n"));
    });
    // it("should build a proper body", () => {
    //   console.log(meta.src);
    // });
  });
});
