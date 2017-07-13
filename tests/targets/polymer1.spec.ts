import { expect, use } from "chai";
import * as sinon from "sinon";
import { SinonSpy } from "sinon";
import { CompilerOptions, createSourceFile, ModuleKind, ScriptTarget, SourceFile } from "typescript";
import { Module } from "../../src/builder";
import { cache } from "../../src/config";
import chaiString = require("chai-string");

use(chaiString);

describe("Polymer v1 output", () => {
  function transpile(tpl: string) {
    const component = (target: "ES5" | "ES2015") => {
      const compilerOptions: CompilerOptions = { target: ScriptTarget[ target ], module: ModuleKind.ES2015 };
      const source: SourceFile = createSourceFile("sample.ts", tpl, compilerOptions.target, true);
      return new Module(source, compilerOptions, "Polymer1").toString();
    };
    return {
      get es5() {
        return component("ES5");
      },
      get es6() {
        return component("ES2015");
      },
      component
    };
  }

  it("should add imports", () => {
    const component = transpile(`
      import { CustomElement, template } from "twc/polymer";
      import "bower:polymer/polymer.html";
      import { prop } from "bower:some/component.html#NS";
      import "style.css";
      import "script.js";`);

    expect(component.es5).to.equalIgnoreSpaces(`
      <link rel="import" href="../../polymer/polymer.html">
      <link rel="import" href="../../some/component.html">
      <link rel="stylesheet" href="style.css">
      <script src="script.js"></script>`
    );
  });
  it("should allow components without inheritance", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement {}`);

    expect(() => component.es5).to.not.throw(SyntaxError);
  });
  it("should throw an error if extending class other than Polymer.Element", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends HTMLElement {}`);

    expect(() => component.es5).to.throw(SyntaxError);
  });
  it("should throw an error if trying to use a mixin", () => {
    expect(() => transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends MyMixin(Polymer.Element) {}`).es5
    ).to.throw("Components in Polymer v1 can only extend `Polymer.Element` class.");

    expect(() => transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends MyNamespace.MyMixin(Polymer.Element) {}`).es5
    ).to.throw("Components in Polymer v1 can only extend `Polymer.Element` class.");
  });
  it("should allow to use behaviors via Polymer.mixinBehaviors mixin", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.mixinBehaviors([ MyBehavior ], Polymer.Element) {}`);

    expect(() => component.es5).to.not.throw(SyntaxError);
  });
  it("should not allow to use different base than Polymer.Element in Polymer.mixinBehaviors mixin", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.mixinBehaviors([ MyBehavior ], HTMLElement) {}`);

    expect(() => component.es5).to.throw(SyntaxError);
  });
  describe("should allow simple expressions in the templates", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        name: string;
        template() {
          return \`<h1 title="$\{document.title + this.name}">Hello $\{this.name === "test" ? "default" : this.name}</h1>\`;
        }
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <h1 title="[[_expr0(name)]]">Hello [[_expr1(name)]]</h1>
          </template>
          <script>
            var MyElement = Polymer({
              is: "my-element",
              properties: {
                name: String
              },
              _expr0: function(name) {
                return document.title + this.name;
              },
              _expr1: function(name) {
                return this.name === "test" ? "default" : this.name;
              }
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <h1 title="[[_expr0(name)]]">Hello [[_expr1(name)]]</h1>
          </template>
          <script>
            const MyElement = Polymer({
              is: "my-element",
              properties: {
                name: String
              },
              _expr0(name) {
                return document.title + this.name;
              },
              _expr1(name) {
                return this.name === "test" ? "default" : this.name;
              }
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should not emit exports", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {}
      export CustomElement;
      const test = 10;
      export default test`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({ is: "my-element" });
            CustomElement;
            var test = 10;
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({ is: "my-element" });
            CustomElement;
            const test = 10;
          </script>
        </dom-module>`
      );
    });
  });
  describe("should show (not throw) an error if @observe() is called on non-existing property", () => {
    beforeEach(() => sinon.stub(console, "error"));
    afterEach(() => (console.error as SinonSpy).restore());

    const component = transpile(`
      import { CustomElement, observe } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        @observe("iDoNotExist") method() {}
      }`);

    it("es5", () => {
      component.component("ES5");
      expect((console.error as SinonSpy).called).to.equal(true);
    });
    it("es6", () => {
      component.component("ES2015");
      expect((console.error as SinonSpy).called).to.equal(true);
    });
  });
  describe("should log the time taken to generate a module", () => {
    beforeEach(() => {
      delete process.env[ "SILENT" ];
      sinon.stub(console, "log");
    });
    afterEach(() => {
      process.env[ "SILENT" ] = true;
      (console.log as SinonSpy).restore();
    });

    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {}`);

    it("es5", () => {
      component.component("ES5");
      expect((console.log as SinonSpy).called).to.equal(true);
    });
    it("es6", () => {
      component.component("ES2015");
      expect((console.log as SinonSpy).called).to.equal(true);
    });
  });
  describe("should update namespaces", () => {
    let cachedFiles;
    before(() => {
      cachedFiles = cache.files;
      cache.files = new Map([
        [
          "sample.file", new Map([
          [
            "some.html", new Map([
            [ "A", { name: "A", type: "VariableDeclaration", namespace: "NS" } ],
            [ "B", { name: "B", type: "VariableDeclaration", namespace: "NS" } ],
            [ "C", { name: "C", type: "VariableDeclaration", namespace: "NS" } ]
          ])
          ]
        ])
        ]
      ]);
    });
    after(() => {
      cache.files = cachedFiles;
    });
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      import { A, B, C } from "some.html";
      import * as D from "other.html";

      @CustomElement()
      export class MyElement extends Polymer.Element {
        method() {
          return A + B + C + D;
        }
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <link rel="import" href="some.html">
        <link rel="import" href="other.html">
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
              is: "my-element",
              method: function() {
                return NS.A + NS.B + NS.C + D;
              }
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <link rel="import" href="some.html">
        <link rel="import" href="other.html">
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
              is: "my-element",
              method() {
                return NS.A + NS.B + NS.C + D;
              }
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should compile simple components", () => {
    const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      /**
       * This is a custom element
       */
      @CustomElement()
      @template("<h1>Hello World</h1>")
      export class MyElement extends Polymer.Element {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <!--
        This is a custom element
        -->
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <!--
        This is a custom element
        -->
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should compile simple components with template as a method", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        template() {
          return \`<h1>Hello World</h1>\`;
        }
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should compile components without template", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should create a valid properties configuration", () => {
    const component = transpile(`
      import { CustomElement, attr, notify } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        stringProp: string;
        readonly readOnlyProp: any;
        @attr attribute: number;
        @notify watched = false;
        iHaveValue = "the value";
        iHaveComplexValue = [ 1, 2, 3 ];
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
              is: "my-element",
              properties: {
                stringProp: String,
                readOnlyProp: { type: Object, readOnly: true },
                attribute: { type: Number, reflectToAttribute: true },
                watched: { type: Boolean, value: false, notify: true },
                iHaveValue: { type: String, value: "the value" },
                iHaveComplexValue: { type: Array, value: function() { return [ 1, 2, 3 ]; } }
              }
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
              is: "my-element",
              properties: {
                stringProp: String,
                readOnlyProp: { type: Object, readOnly: true },
                attribute: { type: Number, reflectToAttribute: true },
                watched: { type: Boolean, value: false, notify: true },
                iHaveValue: { type: String, value: "the value" },
                iHaveComplexValue: { type: Array, value: function() { return [ 1, 2, 3 ]; } }
              }
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should create computed properties and resolver methods", () => {
    const component = transpile(`
      import { CustomElement, compute } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        age: number;
        @compute((age) => age >= 18) isAdult1: boolean;
        @compute((x) => x >= 18, ['age']) isAdult2: boolean;
        @compute('computer', ['age']) isAdult3: boolean;

        computer(y) {
          return y >= 18;
        }
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
              is: "my-element",
              properties: {
                age: Number,
                isAdult1: { type: Boolean, computed: "_isAdult1Computed(age)" },
                isAdult2: { type: Boolean, computed: "_isAdult2Computed(age)" },
                isAdult3: { type: Boolean, computed: "computer(age)" }
              },

              _isAdult1Computed: function(age) {
                return age >= 18;
              },
              _isAdult2Computed: function(x) {
                return x >= 18;
              },
              computer: function (y) {
                return y >= 18;
              }
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
              is: "my-element",
              properties: {
                age: Number,
                isAdult1: { type: Boolean, computed: "_isAdult1Computed(age)" },
                isAdult2: { type: Boolean, computed: "_isAdult2Computed(age)" },
                isAdult3: { type: Boolean, computed: "computer(age)" }
              },

              _isAdult1Computed(age) {
                return age >= 18;
              },
              _isAdult2Computed(x) {
                return x >= 18;
              },
              computer (y) {
                return y >= 18;
              }
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should create observers declarations", () => {
    const component = transpile(`
      import { CustomElement, observe } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        age: number;
        name: { first: string; last: string; };

        @observe() gettingOlder(age) {}
        @observe("name") nameChange() {}
        @observe("name.first") firstNameChange() {}
        @observe() everything1(age, name) {}
        @observe("age", "name") everything2() {}
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
              is: "my-element",
              observers: [
                "firstNameChange(name.first)",
                "everything1(age, name)",
                "everything2(age, name)"
              ],
              properties: {
                age: {
                  type: Number,
                  observer: "gettingOlder"
                },
                name: {
                  type: Object,
                  observer: "nameChange"
                }
              },

              gettingOlder: function(age) {},
              nameChange: function() {},
              firstNameChange: function() {},
              everything1: function(age, name) {},
              everything2: function() {}
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
              is: "my-element",
              observers: [
                "firstNameChange(name.first)",
                "everything1(age, name)",
                "everything2(age, name)"
              ],
              properties: {
                age: {
                  type: Number,
                  observer: "gettingOlder"
                },
                name: {
                  type: Object,
                  observer: "nameChange"
                }
              },

              gettingOlder(age) {},
              nameChange() {},
              firstNameChange() {},
              everything1(age, name) {},
              everything2() {}
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should include custom event declarations", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";

      interface TheEvent extends Event {}

      /**
       * Fired when \`element\` changes its awesomeness level.
       */
      interface AwesomeChange extends CustomEvent {
        detail: {
          /** New level of awesomeness. */
          newAwesome: number;
        }
      }

      @CustomElement()
      export class MyElement extends Polymer.Element {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
            /**
             * @event the-event
             */
            /**
             * Fired when \`element\` changes its awesomeness level.
             *
             * @event awesome-change
             * @param {number} newAwesome New level of awesomeness.
             */
              is: "my-element"
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
            /**
             * @event the-event
             */
            /**
             * Fired when \`element\` changes its awesomeness level.
             *
             * @event awesome-change
             * @param {number} newAwesome New level of awesomeness.
             */
              is: "my-element"
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should add behaviors to the component declaration", () => {
    let cachedFiles;
    before(() => {
      cachedFiles = cache.files;
      cache.files = new Map([
        [
          "sample.file", new Map([
          [
            "bower:iron-resizable-behavior/iron-resizable-behavior.html", new Map([
            [
              "IronResizableBehavior", {
              name: "IronResizableBehavior",
              type: "VariableDeclaration",
              namespace: "Polymer"
            }
            ]
          ])
          ]
        ])
        ]
      ]);
    });
    after(() => {
      cache.files = cachedFiles;
    });
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      import { IronResizableBehavior } from "bower:iron-resizable-behavior/iron-resizable-behavior.html"

      @CustomElement()
      export class MyElement extends Polymer.mixinBehaviors([ IronResizableBehavior ], Polymer.Element) {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <link rel="import" href="../../iron-resizable-behavior/iron-resizable-behavior.html">
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
              is: "my-element",
              behaviors: [
                Polymer.IronResizableBehavior
              ]
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <link rel="import" href="../../iron-resizable-behavior/iron-resizable-behavior.html">
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
              is: "my-element",
              behaviors: [
                Polymer.IronResizableBehavior
              ]
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should transpile non-component entities as plain JavaScript", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";

      const test = 10;

      export class SomeClass {
        prop: string;
      }

      @CustomElement()
      export class MyElement extends Polymer.Element {}

      function someFunction() {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var test = 10;
            var SomeClass = (function() {
                function SomeClass() {}
                return SomeClass;
            }());

            var MyElement = Polymer({ is: "my-element" });

            function someFunction() {}
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const test = 10;
            class SomeClass {}

            const MyElement = Polymer({ is: "my-element" });

            function someFunction() {}
          </script>
        </dom-module>`
      );
    });
  });
  describe("should wrap code in a namespace if desired", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";

      namespace Custom {
        @CustomElement()
        export class MyElement extends Polymer.Element {
          prop: string;
        }

        function someFunction() {}
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var Custom;
            (function(Custom) {
              var MyElement = Polymer({
                is: "my-element",
                properties: {
                  prop: String
                }
              });

              function someFunction() {}
            })(Custom || (Custom = {}));
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var Custom;
            (function(Custom) {
              const MyElement = Polymer({
                is: "my-element",
                properties: {
                  prop: String
                }
              });

              function someFunction() {}
            })(Custom || (Custom = {}));
          </script>
        </dom-module>`
      );
    });
  });
  describe("should add static members of a component properly", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";

      @CustomElement()
      export class MyElement extends Polymer.Element {
        static prop1: string;
        static prop2 = "test";
        static prop3 = 10;

        static method() {}
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({ is: "my-element" });

            MyElement.method = function method() {};

            MyElement.prop1 = undefined;
            MyElement.prop2 = "test";
            MyElement.prop3 = 10;
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({ is: "my-element" });

            MyElement.method = function method() {};

            MyElement.prop1 = undefined;
            MyElement.prop2 = "test";
            MyElement.prop3 = 10;
          </script>
        </dom-module>`
      );
    });
  });
  describe("should add styles to component", () => {
    const component = transpile(`
      import { CustomElement, style } from "twc/polymer";
      @CustomElement()
      @style(":host { color: red; }", "shared-style")
      export class MyElement extends Polymer.Element {
        template() {
          return \`<h1>Hello World</h1>\`;
        }
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <style>:host { color: red; }</style>
            <style include="shared-style"></style>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <style>:host { color: red; }</style>
            <style include="shared-style"></style>
            <h1>Hello World</h1>
          </template>
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should remove super() calls", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        constructor() {
          super();
        }
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
                is: "my-element",
                created: function() {}
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
                is: "my-element",
                created() {}
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("should update lifecycle methods", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        constructor() {}
        connectedCallback() {}
        disconnectedCallback() {}
        attributeChangedCallback() {}
      }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
                is: "my-element",
                created: function() {},
                attached: function() {},
                detached: function() {},
                attributeChanged: function() {}
            });
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
                is: "my-element",
                created() {},
                attached() {},
                detached() {},
                attributeChanged() {}
            });
          </script>
        </dom-module>`
      );
    });
  });
  describe("Config", () => {
    it("should throw an error if trying to set mutableData for Polymer v1", () => {
      expect(() => transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement({mutableData: "on"})
      export class MyElement extends Polymer.Element {}`).es5
      ).to.throw("MutableData is not available in Polymer v1");

      expect(() => transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement({mutableData: "optional"})
      export class MyElement extends Polymer.Element {}`).es5
      ).to.throw("MutableData is not available in Polymer v1");
    });
    describe("should override implicit name", () => {
      const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({name: "other-name"})
      export class MyElement extends Polymer.Element {}`);

      it("es5", () => {
        expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="other-name">
          <script>
            var MyElement = Polymer({ is: "other-name" });
          </script>
        </dom-module>`
        );
      });
      it("es6", () => {
        expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="other-name">
          <script>
            const MyElement = Polymer({ is: "other-name" });
          </script>
        </dom-module>`
        );
      });
    });
    describe("should allow to provide a template", () => {
      const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({template: "<h1>Hello World</h1>"})
      export class MyElement extends Polymer.Element {}`);

      it("es5", () => {
        expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
      it("es6", () => {
        expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
    });
    describe("should allow to provide styles", () => {
      const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({template: "<h1>Hello World</h1>", styles: [":host {color: red;}", "shared-style"]})
      export class MyElement extends Polymer.Element {}`);

      it("es5", () => {
        expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <style>:host { color: red; }</style>
            <style include="shared-style"></style>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
      it("es6", () => {
        expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <style>:host { color: red; }</style>
            <style include="shared-style"></style>
            <h1>Hello World</h1>
          </template>
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
    });
    describe("should allow to disable properties auto registration", () => {
      const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({autoRegisterProperties: false})
      export class MyElement extends Polymer.Element {
        prop: string;
      }`);

      it("es5", () => {
        expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
      it("es6", () => {
        expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
    });
    describe("should allow to enable single properties registration via @property decorator", () => {
      const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({autoRegisterProperties: false})
      export class MyElement extends Polymer.Element {
        prop1: string;
        @property({readOnly: true}) prop2: string;
        @property() @notify() prop3: string;
        @notify() @property() @attr() prop4: string;
        @notify() @property({reflectToAttribute: false, notify: false}) @attr() prop5: string;
      }`);

      it("es5", () => {
        expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            var MyElement = Polymer({
              is: "my-element",
              properties: {
                prop2: {
                  type: String,
                  readOnly: true
                },
                prop3: {
                  type: String,
                  notify: true
                },
                prop4: {
                  type: String,
                  reflectToAttribute: true,
                  notify: true
                },
                prop5: {
                  type: String,
                  reflectToAttribute: true
                }
              }
            });
          </script>
        </dom-module>`
        );
      });
      it("es6", () => {
        expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            const MyElement = Polymer({
              is: "my-element",
              properties: {
                prop2: {
                  type: String,
                  readOnly: true
                },
                prop3: {
                  type: String,
                  notify: true
                },
                prop4: {
                  type: String,
                  reflectToAttribute: true,
                  notify: true
                },
                prop5: {
                type: String,
                reflectToAttribute: true}
              }
            });
          </script>
        </dom-module>`
        );
      });
    });
    describe("should allow to set Polymer `strip-whitespace` option", () => {
      const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({template: "<h1>Hello World</h1>", stripWhitespace: true})
      export class MyElement extends Polymer.Element {}`);

      it("es5", () => {
        expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template strip-whitespace>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
      it("es6", () => {
        expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template strip-whitespace>
            <h1>Hello World</h1>
          </template>
          <script>
            const MyElement = Polymer({ is: "my-element" });
          </script>
        </dom-module>`
        );
      });
    });
  });
});
