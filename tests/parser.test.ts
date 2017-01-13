import { use, expect } from "chai";
use(require("chai-string"));
import { readFileSync } from "fs";
import DTSParser from "../src/parsers/DTSParser";
import JSParser from "../src/parsers/JSParser";

describe("parsers", () => {
  describe("DTS Parser", () => {
    let meta;
    let deprecatedCallbacksDTS;

    before(() => {
      meta = new DTSParser(
        `${__dirname}/assets/es6out`,
        readFileSync(`${__dirname}/assets/es6out/input-math.d.ts`, "utf8")
      );
      deprecatedCallbacksDTS = readFileSync(`${__dirname}/assets/deprecated-callbacks.d.ts`, "utf8");
    });

    it("should throw an error if deprecated lifecycle callback is used", () => {
      let assetsDir = `${__dirname}/assets/`;
      expect(() => new DTSParser(
        assetsDir, deprecatedCallbacksDTS
      )).to.throw("`created` callback is deprecated. Please use `constructor` instead");

      expect(() => new DTSParser(
        assetsDir, deprecatedCallbacksDTS
          .replace(/created/, "constructor")
      )).to.throw("`attached` callback is deprecated. Please use `connectedCallback` instead");

      expect(() => new DTSParser(
        assetsDir, deprecatedCallbacksDTS
          .replace(/created/, "constructor")
          .replace(/attached/, "connectedCallback")
      )).to.throw("`detached` callback is deprecated. Please use `disconnectedCallback` instead");

      expect(() => new DTSParser(
        assetsDir, deprecatedCallbacksDTS
          .replace(/created/, "constructor")
          .replace(/attached/, "connectedCallback")
          .replace(/detached/, "disconnectedCallback")
      )).to.throw("`attributeChanged` callback is deprecated. Please use `attributeChangedCallback` instead");

      expect(() => new DTSParser(
        assetsDir, deprecatedCallbacksDTS
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

  function parserTests(esVersion: number) {
    return () => {
      let inputMathMeta: JSParser;
      let elementNameMeta: JSParser;
      let noTemplateMeta: JSParser;

      before(() => {
        let baseDir = `${__dirname}/assets/es${esVersion}out`;
        inputMathMeta = new JSParser(
          baseDir,
          readFileSync(`${baseDir}/input-math.d.ts`, "utf8"),
          readFileSync(`${baseDir}/input-math.js`, "utf8")
        );

        elementNameMeta = new JSParser(
          baseDir,
          readFileSync(`${baseDir}/element-name.d.ts`, "utf8"),
          readFileSync(`${baseDir}/element-name.js`, "utf8")
        );

        noTemplateMeta = new JSParser(
          baseDir,
          readFileSync(`${baseDir}/no-template.d.ts`, "utf8"),
          readFileSync(`${baseDir}/no-template.js`, "utf8")
        );
      });

      it("should fetch additional generated class name if available", () => {
        expect(elementNameMeta.helperClassName).to.be.oneOf([ "ElementName_1", undefined ]);
        expect(inputMathMeta.helperClassName).to.be.oneOf([ "InputMath_1", undefined ]);
      });
      it("should fetch constructor body if it was defined in TS file, otherwise it should be skipped", () => {
        expect(elementNameMeta.methods.get("constructor")).to.equal(undefined);
        expect(inputMathMeta.methods.get("constructor")).to.not.equal(undefined);
        expect(inputMathMeta.methods.get("constructor").body).to.not.equal(undefined);
      });
      it("should fetch list of scripts and html imports and remove them", () => {
        expect(elementNameMeta.scripts).to.deep.equal([]);
        expect(elementNameMeta.links).to.deep.equal([
          "../imports/polymer.html",
          "../imports/esp.html"
        ]);

        expect(inputMathMeta.links).to.deep.equal([]);
        expect(inputMathMeta.scripts).to.deep.equal([
          "../imports/jquery.js",
          "../imports/mathquill.js"
        ]);
      });
      it("should fetch declared events data", () => {
        expect(elementNameMeta.events.get("ProfileChangeEvent")).to.deep.equal({
          name: "ProfileChangeEvent",
          description: "",
          params: [
            {
              name: "newProfile",
              description: "New profile.",
              type: "any"
            }
          ]
        });
        expect(elementNameMeta.events.get("SomeEvent")).to.deep.equal({
          name: "SomeEvent",
          description: "Fires whenever ** .. yo!",
          params: [
            {
              name: "deep",
              description: "",
              type: "{\n            property: boolean;\n        }"
            },
            {
              name: "name",
              description: "New name",
              type: "string"
            }
          ]
        });
      });
      it("should fetch jsDoc style comment for the class", () => {
        expect(elementNameMeta.jsDoc).to.equalIgnoreSpaces("A test class @demo test.html");
      });
      it("should fetch jsDoc for methods", () => {
        expect(elementNameMeta.methods.get("observer").jsDoc).to.equal("Observer method");
        expect(elementNameMeta.methods.get("staticTest").jsDoc).to.equal("Some static method");
      });
      it("should fetch jsDoc for properties", () => {
        expect(elementNameMeta.properties.get("greetings").jsDoc).to.equal("A greetings list");
      });
      it("should fetch list of properties", () => {
        expect(Array.from(noTemplateMeta.properties.keys())).to.deep.equal([ "name" ]);
        expect(Array.from(elementNameMeta.properties.keys())).to.deep.equal([ "greetings", "test", "profile" ]);
        expect(Array.from(inputMathMeta.properties.keys())).to.deep.equal([
          "HISTORY_SIZE", "SYMBOLS_BASIC", "SYMBOLS_GREEK", "SYMBOLS_PHYSICS", "testValue", "value", "symbols",
          "showSymbols", "_history", "_mathField", "_observerLocked", "_freezeHistory", "_editor"
        ]);
      });
      it("should fetch list of methods", () => {
        expect(Array.from(noTemplateMeta.methods.keys())).to.deep.equal([]);
        expect(Array.from(elementNameMeta.methods.keys())).to.deep.equal([
          "staticTest", "observer", "observerAuto", "computedProp", "computedPropAuto"
        ]);
        expect(Array.from(inputMathMeta.methods.keys())).to.deep.equal([
          "constructor", "ready", "cmd", "undo", "valueChanged",
          "symbolsChanged", "keyShortcuts", "_updateValue", "_updateHistory"
        ]);
      });
      it("should fetch default values from parsed constructor", () => {
        expect(elementNameMeta.properties.get("test").value).to.equal(`"tester"`);

        expect(inputMathMeta.properties.get("value").value).to.equal(`""`);
        expect(inputMathMeta.properties.get("symbols").value.replace(/\s/g, "")).to.equal(`[
        InputMath_1.SYMBOLS_BASIC,
        InputMath_1.SYMBOLS_GREEK
      ]`.replace(/\s/g, ""));
        expect(inputMathMeta.properties.get("showSymbols").value).to.equal(`""`);
        expect(inputMathMeta.properties.get("_observerLocked").value).to.equal("false");
        expect(inputMathMeta.properties.get("_freezeHistory").value).to.equal("false");
        expect(inputMathMeta.properties.get("_editor").value).to.equal("document.createElement(\"div\")");
      });
      it("should fetch list of decorators used per field", () => {
        let { methods } = inputMathMeta;

        expect(methods.get("keyShortcuts").decorators).to.have.deep.property("0.name", "listen");
      });
      it("should fetch list of annotations used per field", () => {

        expect(elementNameMeta.properties.get("greetings").annotations).to.have.deep.property("0.name", "attr");
        expect(elementNameMeta.properties.get("greetings").annotations).to.have.deep.property("0.params", undefined);

        expect(elementNameMeta.properties.get("profile").annotations).to.have.deep.property("0.name", "notify");
        expect(elementNameMeta.properties.get("profile").annotations).to.have.deep.property("0.params", undefined);

        expect(elementNameMeta.methods.get("observer").annotations).to.have.deep.property("0.name", "observe");
        expect(elementNameMeta.methods.get("observer").annotations).to.have.deep.property("0.params", `"profile.prop"`);

        expect(elementNameMeta.methods.get("observerAuto").annotations).to.have.deep.property("0.name", "observe");
        expect(elementNameMeta.methods.get("observerAuto").annotations).to.have.deep.property("0.params", undefined);

        expect(elementNameMeta.methods.get("computedProp").annotations).to.have.deep.property("0.name", "computed");
        expect(elementNameMeta.methods.get("computedProp").annotations).to.have.deep.property("0.params", `"test"`);

        expect(elementNameMeta.methods.get("computedPropAuto").annotations).to.have.deep.property("0.name", "computed");
        expect(elementNameMeta.methods.get("computedPropAuto").annotations)
          .to
          .have
          .deep
          .property("0.params", undefined);

        expect(inputMathMeta.properties.get("value").annotations).to.have.deep.property("0.name", "attr");
        expect(inputMathMeta.properties.get("value").annotations).to.have.deep.property("0.params", undefined);

        expect(inputMathMeta.properties.get("symbols").annotations).to.have.deep.property("0.name", "notify");
        expect(inputMathMeta.properties.get("symbols").annotations).to.have.deep.property("0.params", undefined);

        expect(inputMathMeta.methods.get("valueChanged").annotations).to.have.deep.property("0.name", "observe");
        expect(inputMathMeta.methods.get("valueChanged").annotations).to.have.deep.property("0.params", `"value"`);

        expect(inputMathMeta.methods.get("symbolsChanged").annotations).to.have.deep.property("0.name", "observe");
        expect(inputMathMeta.methods.get("symbolsChanged").annotations)
          .to.have.deep.property("0.params", `"showSymbols"`);
      });
      it("should fetch decorators for class", () => {
        expect(inputMathMeta.decorators).to.have.length(1);
      });
      it("should fetch list of class decorators", () => {
        let classDecorators = inputMathMeta.decorators;
        expect(classDecorators).to.have.deep.property("0.name", "component");
      });
      it("should exclude annotations from class decorators list", () => {
        expect(inputMathMeta.decorators).to.not.have.deep.property("0.name", "template");
      });
      it("should fetch annotations for class", () => {
        expect(elementNameMeta.annotations).to.have.deep.property("0.name", "template");
        expect(elementNameMeta.annotations).to.have.deep.property("0.params", `"template.element-name.html"`);
        expect(elementNameMeta.annotations).to.have.deep.property("1.name", "style");
        expect(elementNameMeta.annotations).to.have.deep.property("1.params", `"h1 {color: red;}"`);

        expect(inputMathMeta.annotations).to.have.deep.property("0.name", "template");
        expect(inputMathMeta.annotations).to.have.deep.property("0.params", `"<input>"`);

        expect(noTemplateMeta.annotations).to.deep.equal([]);
      });
      it("should fetch method bodies", () => {
        expect(elementNameMeta.methods.get("constructor")).to.equal(undefined);
        expect(elementNameMeta.methods.get("staticTest").body).to.be.equalIgnoreSpaces(`
          () {
            console.log("static");
          }
        `);
        expect(elementNameMeta.methods.get("observer").body).to.be.equalIgnoreSpaces(`
          (val) {
            console.log("val:", val);
          }
        `);
        expect(elementNameMeta.methods.get("observerAuto").body).to.be.equalIgnoreSpaces(`
          (greetings) {
            console.log("greetings:", greetings);
          }
        `);
        expect(elementNameMeta.methods.get("computedProp").body).to.be.equalIgnoreSpaces(`
          (val) {
            console.log(val);
            return val + "!";
          }
        `);
        expect(elementNameMeta.methods.get("computedPropAuto").body).to.be.equalIgnoreSpaces(`
          (test) {
            console.log("test:", test);
            return test + "!";
          }
        `);

        expect(inputMathMeta.methods.get("constructor").body).to.be.equalIgnoreSpaces(
          esVersion === 5 ? `() {
            var _this = _super.call(this) || this;
            var editor = _this._editor;
            editor.id = \"editor\";
            editor.classList.add(_this.is);
            _this[\"_mathField\"] = MathQuill.getInterface(2).MathField(editor, {
              spaceBehavesLikeTab: true,
              handlers: {
                edit: _this._updateValue.bind(_this)
              }
            });
            return _this;
          }` : `() {
            super();
            var editor = this._editor;
            editor.id = \"editor\";
            editor.classList.add(this.is);
            this[\"_mathField\"] = MathQuill.getInterface(2).MathField(editor, {
              spaceBehavesLikeTab: true,
              handlers: {
                edit: this._updateValue.bind(this)
              }
            });
          }`
        );
        expect(inputMathMeta.methods.get("ready").body)
          .to.be.equalIgnoreSpaces(
          `() {
            this.insertBefore(this._editor, this.$.controls);
          }`
        );
        expect(inputMathMeta.methods.get("cmd").body)
          .to.be.equalIgnoreSpaces(
          `(ev) {
            this._mathField.cmd(ev.model.item.cmd).focus();
          }`
        );
        expect(inputMathMeta.methods.get("undo").body)
          .to.be.equalIgnoreSpaces(
          `() {
            if (this._history && this._history.length > 0) {
              this._freezeHistory = true;
              this.value = this._history.pop();
              this._freezeHistory = false;
            }
          }`
        );
        expect(inputMathMeta.methods.get("valueChanged").body)
          .to.be.equalIgnoreSpaces(
          `(value, prevValue) {
            this._updateHistory(prevValue);
            if (this._observerLocked) {
              return;
            }
            this._mathField.select().write(value);
            if (this._mathField.latex() === \"\") {
              this.undo();
            }
          }`
        );
        expect(inputMathMeta.methods.get("symbolsChanged").body
          .replace(/InputMath_1/, "InputMath")
          .replace(/groupName => {/, "function (groupName) {"))
          .to.be.equalIgnoreSpaces(
          `(symbols) {
            if (symbols) {
              this.symbols = symbols.split(\",\").map(function (groupName) {
                return InputMath[\"SYMBOLS_\" + groupName.toUpperCase()] || [];
              });
            }
          }`
        );
        expect(inputMathMeta.methods.get("keyShortcuts").body)
          .to.be.equalIgnoreSpaces(
          `(ev) {
            if (ev.ctrlKey && ev.keyCode === 90) {
              this.undo();
            }
          }`
        );
        expect(inputMathMeta.methods.get("_updateValue").body)
          .to.be.equalIgnoreSpaces(
          `(test) {
            console.log(test);
            this._observerLocked = true;
            this.value = this._mathField.latex();
            this._observerLocked = false;
          }`
        );
        expect(inputMathMeta.methods.get("_updateHistory").body.replace(/InputMath_1/, "InputMath"))
          .to.be.equalIgnoreSpaces(
          `(prevValue) {
            if (!this._history) {
              this._history = [];
            }
            if (this._freezeHistory || prevValue == null) {
              return;
            }
            this._history.push(prevValue);
            if (this._history.length > InputMath.HISTORY_SIZE) {
              this._history.shift();
            }
          }`
        );
      });
    };
  }

  describe("JS Parser", () => {
    describe("ES5", parserTests(5));
    describe("ES6", parserTests(6));
  });
});
