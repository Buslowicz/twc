import { expect, use } from "chai";
import * as sinon from "sinon";
import { SinonSpy } from "sinon";
import { CompilerOptions, createSourceFile, ModuleKind, ScriptTarget, SourceFile } from "typescript";
import { Module } from "../../src/builder";
import { cache } from "../../src/config";
import chaiString = require("chai-string");

use(chaiString);

describe("Polymer v2 output", () => {
  function transpile(tpl: string) {
    const component = (target: "ES5" | "ES2015") => {
      const compilerOptions: CompilerOptions = { target: ScriptTarget[ target ], module: ModuleKind.ES2015, noEmitHelpers: true };
      const source: SourceFile = createSourceFile("sample.ts", tpl, compilerOptions.target, true);
      return new Module(source, compilerOptions, "Polymer2").toString();
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
  it("should throw an error if components do not extend any class", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement {}`);

    expect(() => component.es5).to.throw(SyntaxError);
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
        <dom-module is="my-element">
        <script>
          var MyElement = (function(_super) {
            __extends(MyElement, _super);

            function MyElement() {
              return _super !== null && _super.apply(this, arguments) || this;
            }
            Object.defineProperty(MyElement, "is", {
              get: function() {
                return "my-element";
              },
              enumerable: true,
              configurable: true
            });
            return MyElement;
          }(Polymer.Element));
          customElements.define(MyElement.is, MyElement);
          CustomElement;
          var test = 10;
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
            CustomElement;
            const test = 10;
          </script>
        </dom-module>`
      );
    });
  });
  describe("should accept mixins", () => {
    const component = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement()
      export class MyElement extends OtherMixin(MyMixin(Polymer.Element)) {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            var MyElement = (function(_super) {
              __extends(MyElement, _super);

              function MyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(MyElement, "is", {
                get: function() {
                  return "my-element";
                },
                enumerable: true,
                configurable: true
              });
              return MyElement;
            }(OtherMixin(MyMixin(Polymer.Element))));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            class MyElement extends OtherMixin(MyMixin(Polymer.Element)) {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
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
      import { A, B, C } from "some.html#NS";
      import * as D from "other.html#OtherNS";

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
        <dom-module is="my-element">
        <script>
          var MyElement = (function(_super) {
            __extends(MyElement, _super);

            function MyElement() {
              return _super !== null && _super.apply(this, arguments) || this;
            }
            Object.defineProperty(MyElement, "is", {
              get: function() {
                return "my-element";
              },
              enumerable: true,
              configurable: true
            });
            MyElement.prototype.method = function() {
              return NS.A + NS.B + NS.C + D;
            };
            return MyElement;
          }(Polymer.Element));
          customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <link rel="import" href="some.html">
        <link rel="import" href="other.html">
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }

              method() {
                return NS.A + NS.B + NS.C + D;
              }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = (function(_super) {
              __extends(MyElement, _super);

              function MyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(MyElement, "is", {
                get: function() {
                  return "my-element";
                },
                enumerable: true,
                configurable: true
              });
              return MyElement;
            }(Polymer.Element));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <!--
        This is a custom element
        -->
        <dom-module is="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            var MyElement = (function(_super) {
              __extends(MyElement, _super);

              function MyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(MyElement, "is", {
                get: function() {
                  return "my-element";
                },
                enumerable: true,
                configurable: true
              });
              return MyElement;
            }(Polymer.Element));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <script>
            var MyElement = (function(_super) {
              __extends(MyElement, _super);

              function MyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(MyElement, "is", {
                get: function() {
                  return "my-element";
                },
                enumerable: true,
                configurable: true
              });
              return MyElement;
            }(Polymer.Element));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <script>
            var MyElement = (function(_super) {
              __extends(MyElement, _super);

              function MyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(MyElement, "is", {
                get: function() {
                  return "my-element";
                },
                enumerable: true,
                configurable: true
              });
              Object.defineProperty(MyElement, "properties", {
                get: function() {
                  return {
                    stringProp: String,
                    readOnlyProp: { type: Object, readOnly: true },
                    attribute: { type: Number, reflectToAttribute: true },
                    watched: { type: Boolean, value: false, notify: true },
                    iHaveValue: { type: String, value: "the value" },
                    iHaveComplexValue: { type: Array, value: function() { return [ 1, 2, 3 ]; } }
                  };
                },
                enumerable: true,
                configurable: true
              });
              return MyElement;
            }(Polymer.Element));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
              static get properties() {
                return {
                  stringProp: String,
                  readOnlyProp: { type: Object, readOnly: true },
                  attribute: { type: Number, reflectToAttribute: true },
                  watched: { type: Boolean, value: false, notify: true },
                  iHaveValue: { type: String, value: "the value" },
                  iHaveComplexValue: { type: Array, value: function() { return [ 1, 2, 3 ]; } }
                };
              }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <script>
		        var MyElement = (function(_super) {
		          __extends(MyElement, _super);

		          function MyElement() {
		            return _super !== null && _super.apply(this, arguments) || this;
		          }
		          Object.defineProperty(MyElement, "is", {
		            get: function() {
		              return "my-element";
		            },
		            enumerable: true,
		            configurable: true
		          });
              Object.defineProperty(MyElement, "properties", {
                get: function() {
                  return {
                    age: Number,
                    isAdult1: { type: Boolean, computed: "_isAdult1Computed(age)" },
                    isAdult2: { type: Boolean, computed: "_isAdult2Computed(age)" },
                    isAdult3: { type: Boolean, computed: "computer(age)" }
                  };
                },
                enumerable: true,
                configurable: true
              });
              MyElement.prototype._isAdult1Computed = function (age) {
                return age >= 18;
              };
              MyElement.prototype._isAdult2Computed = function (x) {
                return x >= 18;
              };
              MyElement.prototype.computer = function (y) {
                return y >= 18;
              };
		          return MyElement;
		        }(Polymer.Element));
		        customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
              static get properties() {
                return {
                  age: Number,
                  isAdult1: { type: Boolean, computed: "_isAdult1Computed(age)" },
                  isAdult2: { type: Boolean, computed: "_isAdult2Computed(age)" },
                  isAdult3: { type: Boolean, computed: "computer(age)" }
                };
              }
              _isAdult1Computed(age) {
                return age >= 18;
              }
              _isAdult2Computed(x) {
                return x >= 18;
              }
              computer (y) {
                return y >= 18;
              }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <script>
		        var MyElement = (function(_super) {
		          __extends(MyElement, _super);

		          function MyElement() {
		            return _super !== null && _super.apply(this, arguments) || this;
		          }
		          Object.defineProperty(MyElement, "is", {
		            get: function() {
		              return "my-element";
		            },
		            enumerable: true,
		            configurable: true
		          });
		          Object.defineProperty(MyElement, "observers", {
		            get: function() {
		              return [
                    "firstNameChange(name.first)",
                    "everything1(age, name)",
                    "everything2(age, name)"
                  ];
		            },
		            enumerable: true,
		            configurable: true
		          });
		          Object.defineProperty(MyElement, "properties", {
		            get: function() {
		              return {
                    age: {
                      type: Number,
                      observer: "gettingOlder"
                    },
                    name: {
                      type: Object,
                      observer: "nameChange"
                    }
                  };
		            },
		            enumerable: true,
		            configurable: true
		          });

              MyElement.prototype.gettingOlder = function(age) {};
              MyElement.prototype.nameChange = function() {};
              MyElement.prototype.firstNameChange = function() {};
              MyElement.prototype.everything1 = function(age, name) {};
              MyElement.prototype.everything2 = function() {};

		          return MyElement;
		        }(Polymer.Element));
		        customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
              static get observers() {
                return [
                  "firstNameChange(name.first)",
                  "everything1(age, name)",
                  "everything2(age, name)"
                ];
              }
              static get properties() {
                return {
                  age: {
                    type: Number,
                    observer: "gettingOlder"
                  },
                  name: {
                    type: Object,
                    observer: "nameChange"
                  }
                };
              }

              gettingOlder(age) {}
              nameChange() {}
              firstNameChange() {}
              everything1(age, name) {}
              everything2() {}
            }
           customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <script>
                /**
                 * @event the-event
                 */
                /**
                 * Fired when \`element\` changes its awesomeness level.
                 *
                 * @event awesome-change
                 * @param {number} newAwesome New level of awesomeness.
                 */
		        var MyElement = (function(_super) {
		          __extends(MyElement, _super);

		          function MyElement() {
		            return _super !== null && _super.apply(this, arguments) || this;
		          }
		          Object.defineProperty(MyElement, "is", {
		            get: function() {
		              return "my-element";
		            },
		            enumerable: true,
		            configurable: true
		          });
		          return MyElement;
		        }(Polymer.Element));
		        customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            /**
             * @event the-event
             */
            /**
             * Fired when \`element\` changes its awesomeness level.
             *
             * @event awesome-change
             * @param {number} newAwesome New level of awesomeness.
             */
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
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
              type: "InterfaceDeclaration",
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
      export class MyElement extends Polymer.mixinBehaviors([ MyBehavior ], Polymer.Element) {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <link rel="import" href="../../iron-resizable-behavior/iron-resizable-behavior.html">
        <dom-module is="my-element">
          <script>
		        var MyElement = (function(_super) {
		          __extends(MyElement, _super);

		          function MyElement() {
		            return _super !== null && _super.apply(this, arguments) || this;
		          }
		          Object.defineProperty(MyElement, "is", {
		            get: function() {
		              return "my-element";
		            },
		            enumerable: true,
		            configurable: true
		          });
		          return MyElement;
		        }(Polymer.mixinBehaviors([ MyBehavior ], Polymer.Element)));
		        customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <link rel="import" href="../../iron-resizable-behavior/iron-resizable-behavior.html">
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.mixinBehaviors([ MyBehavior ], Polymer.Element) {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module is="my-element">
          <script>
            var test = 10;
            var SomeClass = (function() {
                function SomeClass() {}
                return SomeClass;
            }());

		        var MyElement = (function(_super) {
		          __extends(MyElement, _super);

		          function MyElement() {
		            return _super !== null && _super.apply(this, arguments) || this;
		          }
		          Object.defineProperty(MyElement, "is", {
		            get: function() {
		              return "my-element";
		            },
		            enumerable: true,
		            configurable: true
		          });
		          return MyElement;
		        }(Polymer.Element));
		        customElements.define(MyElement.is, MyElement);

            function someFunction() {}
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            const test = 10;
            class SomeClass {}

            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);

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
        <dom-module is="my-element">
          <script>
            var Custom;
            (function(Custom) {
              var MyElement = (function(_super) {
                __extends(MyElement, _super);

                function MyElement() {
                  return _super !== null && _super.apply(this, arguments) || this;
                }
                Object.defineProperty(MyElement, "is", {
                  get: function() {
                    return "my-element";
                  },
                  enumerable: true,
                  configurable: true
                });
                Object.defineProperty(MyElement, "properties", {
                  get: function() {
                    return {
                      prop: String
                    };
                  },
                  enumerable: true,
                  configurable: true
                });
                return MyElement;
              }(Polymer.Element));
              customElements.define(MyElement.is, MyElement);

              function someFunction() {}
            })(Custom || (Custom = {}));
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            var Custom;
            (function(Custom) {
              class MyElement extends Polymer.Element {
                static get is() { return "my-element"; }
                static get properties() {
                  return {
                    prop: String
                  };
                }
              }
              customElements.define(MyElement.is, MyElement);

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
        <dom-module is="my-element">
          <script>
		        var MyElement = (function(_super) {
		          __extends(MyElement, _super);

		          function MyElement() {
		            return _super !== null && _super.apply(this, arguments) || this;
		          }
		          Object.defineProperty(MyElement, "is", {
		            get: function() {
		              return "my-element";
		            },
		            enumerable: true,
		            configurable: true
		          });
              MyElement.method = function () {};
		          return MyElement;
		        }(Polymer.Element));
		        customElements.define(MyElement.is, MyElement);

            MyElement.prop1 = undefined;
            MyElement.prop2 = "test";
            MyElement.prop3 = 10;
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
              static method() {}
            }
            customElements.define(MyElement.is, MyElement);

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
        <dom-module is="my-element">
          <template>
            <style>:host { color: red; }</style>
            <style include="shared-style"></style>
            <h1>Hello World</h1>
          </template>
          <script>
		        var MyElement = (function(_super) {
		          __extends(MyElement, _super);

		          function MyElement() {
		            return _super !== null && _super.apply(this, arguments) || this;
		          }
		          Object.defineProperty(MyElement, "is", {
		            get: function() {
		              return "my-element";
		            },
		            enumerable: true,
		            configurable: true
		          });
		          return MyElement;
		        }(Polymer.Element));
		        customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module is="my-element">
          <template>
            <style>:host { color: red; }</style>
            <style include="shared-style"></style>
            <h1>Hello World</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
  });
});
