"use strict";
const chai_1 = require("chai");
const fs = require("fs");
const parser_1 = require("../src/parser");
describe("PCC", () => {
    describe("static analyser", () => {
        describe("goTo", () => {
            it("should return the index of searched term, omitting all kind of brackets", () => {
                chai_1.expect(parser_1.goTo("= 20;", ";", 1)).to.equal(4);
                chai_1.expect(parser_1.goTo("= { value: 20 };", ";", 1)).to.equal(15);
                chai_1.expect(parser_1.goTo("= () => {let test = 10; return 2 * test;};", ";", 1)).to.equal(41);
                chai_1.expect(parser_1.goTo("= () => {let test = 10; return 2 * test;};", /;/, 1)).to.equal(41);
                chai_1.expect(parser_1.goTo("= () => {let test = 10; return 2 * test;},", /;|,/, 1)).to.equal(41);
                chai_1.expect(parser_1.goTo(`= ";";`, /;|,/, 1)).to.equal(5);
                chai_1.expect(parser_1.goTo(`= ';';`, /;|,/, 1)).to.equal(5);
                chai_1.expect(parser_1.goTo("= `;`;", /;|,/, 1)).to.equal(5);
                chai_1.expect(parser_1.goTo(`= "\\";";`, ";", 1)).to.equal(7);
                chai_1.expect(parser_1.goTo(`= "\\";";`, /"/, 1)).to.equal(2);
            });
            it("should return -1 if searched term was not found", () => {
                chai_1.expect(parser_1.goTo("() => test() * 2", ";")).to.equal(-1);
                chai_1.expect(parser_1.goTo("() => {let test = test(); return test * 2;}", ";")).to.equal(-1);
                chai_1.expect(parser_1.goTo("() => {let test = test(); return test * 2;}", /;/)).to.equal(-1);
            });
        });
        describe("split", () => {
            it("should split the string by search pattern, ignoring all kinds of parentheses", () => {
                chai_1.expect(parser_1.split("a, b, c", ",")).to.deep.equal(["a", " b", " c"]);
                chai_1.expect(parser_1.split("a, b, c", ",", true)).to.deep.equal(["a", "b", "c"]);
                chai_1.expect(parser_1.split("a(b, c), d(e, f)", ",", true)).to.deep.equal(["a(b, c)", "d(e, f)"]);
                chai_1.expect(parser_1.split("a(b, c), d(e, f)", ",", true)).to.deep.equal(["a(b, c)", "d(e, f)"]);
                chai_1.expect(parser_1.split("a('b, c'), d('e, f')", ",", true)).to.deep.equal(["a('b, c')", "d('e, f')"]);
                chai_1.expect(parser_1.split(`a("b, c"), d("e, f")`, ",", true)).to.deep.equal([`a("b, c")`, `d("e, f")`]);
            });
        });
        describe("findClosing", () => {
            it("should find the index of a closing bracket", () => {
                chai_1.expect(parser_1.findClosing("test(...)", 4, "()")).to.equal(8);
                chai_1.expect(parser_1.findClosing("(...)", 0, "()")).to.equal(4);
                chai_1.expect(parser_1.findClosing("[...]", 0, "[]")).to.equal(4);
                chai_1.expect(parser_1.findClosing("{...}", 0, "{}")).to.equal(4);
                chai_1.expect(parser_1.findClosing("<...>", 0, "<>")).to.equal(4);
                chai_1.expect(parser_1.findClosing("(.(.).)", 0, "()")).to.equal(6);
                chai_1.expect(parser_1.findClosing("(.[.].)", 0, "()")).to.equal(6);
                chai_1.expect(parser_1.findClosing("(.[.].)", 0, "()")).to.equal(6);
                chai_1.expect(parser_1.findClosing("(.(.).)()", 0, "()")).to.equal(6);
            });
            it("should throw an error if no closing bracket was found", () => {
                chai_1.expect(() => parser_1.findClosing("(...", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
                chai_1.expect(() => parser_1.findClosing("...", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
                chai_1.expect(() => parser_1.findClosing("", 0, "()")).to.throw(`Parenthesis has no closing at line 1.`);
            });
        });
        describe("regExpClosestIndexOf", () => {
            it("should return index of the first character that matches pattern", () => {
                chai_1.expect(parser_1.regExpClosestIndexOf("abc", 0, /a|b|c/)).to.deep.equal({ index: 0, found: "a" });
                chai_1.expect(parser_1.regExpClosestIndexOf("abc", 0, /b|c/)).to.deep.equal({ index: 1, found: "b" });
                chai_1.expect(parser_1.regExpClosestIndexOf("abc", 0, /c|b/)).to.deep.equal({ index: 1, found: "b" });
            });
            it("should return -1 for index and null for value, if nothing is found", () => {
                chai_1.expect(parser_1.regExpClosestIndexOf("def", 0, /b|c/)).to.deep.equal({ index: -1, found: null });
            });
        });
        describe("regExpIndexOf", () => {
            it("should return index of the first character that matches pattern", () => {
                chai_1.expect(parser_1.regExpIndexOf("abc", 0, /a|b|c/)).to.equal(0);
                chai_1.expect(parser_1.regExpIndexOf("abc", 0, /b|c/)).to.equal(1);
                chai_1.expect(parser_1.regExpIndexOf("abc", 0, /c|b/)).to.equal(1);
            });
            it("should return -1 if nothing is found", () => {
                chai_1.expect(parser_1.regExpIndexOf("def", 0, /b|c/)).to.equal(-1);
            });
        });
        describe("getPropertyNoType", () => {
            it("should recognize all modifiers and a name", () => {
                chai_1.expect(parser_1.getPropertyNoType("prop;")).to.deep.equal({ name: "prop", modifiers: [] });
                chai_1.expect(parser_1.getPropertyNoType("readonly prop;")).to.deep.equal({ name: "prop", modifiers: ["readonly"] });
                chai_1.expect(parser_1.getPropertyNoType("private readonly prop;")).to.deep.equal({
                    name: "prop",
                    modifiers: ["private", "readonly"]
                });
            });
            it("should not exceed char limit", () => {
                let dts = "; readonly prop; test;";
                chai_1.expect(parser_1.getPropertyNoType(dts, dts.indexOf("readonly"), dts.indexOf("prop;") + 4)).to.deep.equal({
                    name: "prop",
                    modifiers: ["readonly"]
                });
            });
        });
        describe("getType", () => {
            function testType(type, expected = type, end = type.length) {
                chai_1.expect(parser_1.getType(`${type};`)).to.deep.equal({ type: expected, end });
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
                chai_1.expect(() => parser_1.getType("{test: boolean;")).to.throw(`Parenthesis has no closing at line 1.`);
            });
        });
        describe("arrToObject", () => {
            it("should create an object using array values as keys", () => {
                chai_1.expect(parser_1.arrToObject([])).to.deep.equal({});
                chai_1.expect(parser_1.arrToObject(["a"])).to.deep.equal({ a: true });
                chai_1.expect(parser_1.arrToObject(["a", "b"])).to.deep.equal({ a: true, b: true });
            });
            it("should use the value provided in second argument", () => {
                chai_1.expect(parser_1.arrToObject(["a", "b"], null)).to.deep.equal({ a: null, b: null });
                chai_1.expect(parser_1.arrToObject(["a", "b"], "yup")).to.deep.equal({ a: "yup", b: "yup" });
            });
        });
        describe("parseParams", () => {
            it("should recognize number of params", () => {
                chai_1.expect(parser_1.parseParams("test1").length).to.equal(1);
                chai_1.expect(parser_1.parseParams("test1, test2").length).to.equal(2);
                chai_1.expect(parser_1.parseParams("test1: number, test2: any").length).to.equal(2);
                chai_1.expect(parser_1.parseParams("test1: {a: number; b: any;}, test2: any").length).to.equal(2);
                chai_1.expect(parser_1.parseParams("test1: {a: number, b: any;}, test2: any").length).to.equal(2);
            });
            it("should recognice name and type of params", () => {
                chai_1.expect(parser_1.parseParams("test1")).to.deep.equal([{ name: "test1" }]);
                chai_1.expect(parser_1.parseParams("test1, test2")).to.deep.equal([{ name: "test1" }, { name: "test2" }]);
                chai_1.expect(parser_1.parseParams("test1: number, test2: any")).to.deep.equal([
                    { name: "test1", type: "Number" },
                    { name: "test2" }
                ]);
                chai_1.expect(parser_1.parseParams("test1: {a: number; b: any;}, test2: any")).to.deep.equal([
                    { name: "test1", type: "Object" },
                    { name: "test2" }
                ]);
            });
        });
        describe("buildField", () => {
            it("should always add name and modifiers", () => {
                let field = parser_1.buildField(["modifier"], "name");
                chai_1.expect(field).to.have.property("modifier");
                chai_1.expect(field).to.have.property("name");
            });
            it("should have params and type if they are defined", () => {
                let field = parser_1.buildField(["modifier"], "name", [{ name: "params" }], "type");
                chai_1.expect(field).to.have.property("type");
                chai_1.expect(field).to.have.property("params");
            });
            it("should NOT add params or type if they are falsy", () => {
                let field = parser_1.buildField(["modifier"], "name", null, null);
                chai_1.expect(field).to.not.have.property("type");
                chai_1.expect(field).to.not.have.property("params");
            });
        });
        describe("parseDTS", () => {
            let meta;
            before(() => {
                meta = parser_1.parseDTS(fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8"));
            });
            it("should recognize types from definition", () => {
                chai_1.expect(meta.className).to.equal("InputMath");
                chai_1.expect(meta.properties).to.deep.equal([
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
                chai_1.expect(meta.methods).to.deep.equal([
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
                meta = parser_1.parseJS(fs.readFileSync(`${__dirname}/assets/input-math.js`, "utf8"), parser_1.parseDTS(fs.readFileSync(`${__dirname}/assets/input-math.d.ts`, "utf8")), { definedAnnotations: ["test1", "test2", "template"] });
            });
            it("should fetch additional generated class name", () => {
                chai_1.expect(meta.generatedName).to.equal("InputMath_1");
            });
            it("should fetch default values from parsed constructor", () => {
                chai_1.expect(meta.values).to.deep.equal({
                    value: `""`,
                    fn: "() => typeof window",
                    _observerLocked: "false",
                    _freezeHistory: "false"
                });
            });
            it("should fetch decorators for all properties and methods", () => {
                let { decorators } = meta;
                chai_1.expect(decorators).to.have.property("value");
                chai_1.expect(decorators).to.have.property("symbols");
                chai_1.expect(decorators).to.have.property("showSymbols");
                chai_1.expect(decorators).to.have.property("valueChanged");
                chai_1.expect(decorators).to.have.property("symbolsChanged");
                chai_1.expect(decorators).to.have.property("keyShortcuts");
            });
            it("should fetch list of decorators used per field", () => {
                let { decorators: { value, symbols, showSymbols, valueChanged, symbolsChanged, keyShortcuts } } = meta;
                chai_1.expect(value).to.include("property");
                chai_1.expect(symbols).to.include("property");
                chai_1.expect(showSymbols).to.include("property");
                chai_1.expect(valueChanged).to.include("observe");
                chai_1.expect(symbolsChanged).to.include("observe");
                chai_1.expect(keyShortcuts).to.include("listen");
            });
            it("should exclude annotations from fields decorators list", () => {
                let { decorators: { value } } = meta;
                chai_1.expect(value).to.not.include("test1");
            });
            it("should fetch list of annotations used per field", () => {
                let { annotations: { value, symbols } } = meta;
                let valueAnnotation = value[0];
                chai_1.expect(valueAnnotation.name).to.equal("test1");
                chai_1.expect(valueAnnotation.params).to.equal(undefined);
                let symbolsAnnotation = symbols[0];
                chai_1.expect(symbolsAnnotation.name).to.equal("test2");
                chai_1.expect(symbolsAnnotation.params).to.equal("5");
            });
            it("should fetch decorators for class under 'class' field", () => {
                chai_1.expect(meta.decorators).to.have.property("class");
            });
            it("should fetch list of class decorators", () => {
                let classDecorators = meta.decorators.class;
                chai_1.expect(classDecorators).to.include("component");
            });
            it("should exclude annotations from class decorators list", () => {
                let classDecorators = meta.decorators.class;
                chai_1.expect(classDecorators).to.not.include("template");
            });
            it("should fetch annotations for class under 'class' field", () => {
                let classAnnotation = meta.annotations.class[0];
                chai_1.expect(classAnnotation.name).to.equal("template");
                chai_1.expect(classAnnotation.params).to.equal(`"<input>"`);
            });
        });
    });
});
