import { expect } from "chai";
import { readFileSync } from "fs";
import DTSParser from "../src/parsers/DTSParser";
import JSParser from "../src/parsers/JSParser";

describe("parsers", () => {
  describe("DTS Parser", () => {
    let meta;
    let deprecatedCallbacksDTS;

    before(() => {
      meta = new DTSParser(readFileSync(`${__dirname}/assets/es6out/input-math.d.ts`, "utf8"));
      deprecatedCallbacksDTS = readFileSync(`${__dirname}/assets/deprecated-callbacks.d.ts`, "utf8");
    });

    it("should throw an error if deprecated lifecycle callback is used", () => {
      expect(() => new DTSParser(
        deprecatedCallbacksDTS
      )).to.throw("`created` callback is deprecated. Please use `constructor` instead");

      expect(() => new DTSParser(
        deprecatedCallbacksDTS
          .replace(/created/, "constructor")
      )).to.throw("`attached` callback is deprecated. Please use `connectedCallback` instead");

      expect(() => new DTSParser(
        deprecatedCallbacksDTS
          .replace(/created/, "constructor")
          .replace(/attached/, "connectedCallback")
      )).to.throw("`detached` callback is deprecated. Please use `disconnectedCallback` instead");

      expect(() => new DTSParser(
        deprecatedCallbacksDTS
          .replace(/created/, "constructor")
          .replace(/attached/, "connectedCallback")
          .replace(/detached/, "disconnectedCallback")
      )).to.throw("`attributeChanged` callback is deprecated. Please use `attributeChangedCallback` instead");

      expect(() => new DTSParser(
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

  function parserTests(esVersion: number) {
    return () => {
      let complexMeta: JSParser;
      let simpleMeta: JSParser;

      before(() => {
        complexMeta = new JSParser(
          readFileSync(`${__dirname}/assets/es${esVersion}out/input-math.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/input-math.js`, "utf8")
        );

        simpleMeta = new JSParser(
          readFileSync(`${__dirname}/assets/es${esVersion}out/element-name.d.ts`, "utf8"),
          readFileSync(`${__dirname}/assets/es${esVersion}out/element-name.js`, "utf8")
        );
      });

      it("should fetch additional generated class name", () => {
        expect(complexMeta.helperClassName).to.be.oneOf([ "InputMath_1", undefined ]);
      });
      it("should fetch constructor body if it was defined in TS file, otherwise it should be skipped", () => {
        expect(simpleMeta.methods.get("constructor")).to.equal(undefined);
        expect(complexMeta.methods.get("constructor")).to.not.equal(undefined);
        expect(complexMeta.methods.get("constructor").body).to.not.equal(undefined);
      });
      it("should fetch list of scripts and html imports and remove them", () => {
        expect(simpleMeta.links).to.deep.equal([
          "bower_components/polymer/polymer.html",
          "node_modules/easy-polymer/dist/esp.html"
        ]);
        expect(complexMeta.scripts).to.deep.equal([
          "bower_components/jquery/jquery.js",
          "bower_components/mathquill/mathquill.js"
        ]);

        expect(simpleMeta.scripts).to.deep.equal([]);
        expect(complexMeta.links).to.deep.equal([]);
      });
      it("should fetch list of properties", () => {
        expect(Array.from(simpleMeta.properties.keys())).to.deep.equal([ "greetings", "test", "profile" ]);
        expect(Array.from(complexMeta.properties.keys())).to.deep.equal([
          "HISTORY_SIZE", "SYMBOLS_BASIC", "SYMBOLS_GREEK", "SYMBOLS_PHYSICS", "testValue", "value", "symbols",
          "showSymbols", "fn", "_history", "_mathField", "_observerLocked", "_freezeHistory", "_editor"
        ]);
      });
      it("should fetch default values from parsed constructor", () => {
        expect(complexMeta.properties.get("value").value).to.equal(`""`);
        expect(complexMeta.properties.get("symbols").value.replace(/\s/g, "")).to.equal(`[
        InputMath_1.SYMBOLS_BASIC,
        InputMath_1.SYMBOLS_GREEK
      ]`.replace(/\s/g, ""));
        expect(complexMeta.properties.get("showSymbols").value).to.equal(`""`);
        expect(complexMeta.properties.get("fn").value).to.equal("function () { return typeof window; }");
        expect(complexMeta.properties.get("_observerLocked").value).to.equal("false");
        expect(complexMeta.properties.get("_freezeHistory").value).to.equal("false");
        expect(complexMeta.properties.get("_editor").value).to.equal("document.createElement(\"div\")");
      });
      it("should fetch list of decorators used per field", () => {
        let { methods } = complexMeta;

        expect(methods.get("keyShortcuts").decorators).to.have.deep.property("0.name", "listen");
      });
      it("should fetch list of annotations used per field", () => {
        let { properties, methods } = complexMeta;

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
        let methods = complexMeta.methods;
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
            "        this[\"_mathField\"] = MathQuill.getInterface(2).MathField(editor, {",
            "            spaceBehavesLikeTab: true,",
            "            handlers: {",
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
            "        _this[\"_mathField\"] = MathQuill.getInterface(2).MathField(editor, {",
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
    }
  }

  describe("JS Parser", () => {
    describe("ES5", parserTests(5));
    describe("ES6", parserTests(6));
  });
});
