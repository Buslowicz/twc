import { expect, use } from "chai";
import * as sinon from "sinon";
import { SinonSpy } from "sinon";
import { CompilerOptions, createSourceFile, ModuleKind, ScriptTarget, SourceFile } from "typescript";
import { Module } from "../../src/builder";
import { cache } from "../../src/config";
import chaiString = require("chai-string");

use(chaiString);

/* tslint:disable:no-unused-expression */

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

  it("should throw an error if components do not extend any class", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement {}`);

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
                    name: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              MyElement.prototype._expr0 = function(name) {
                return document.title + this.name;
              };
              MyElement.prototype._expr1 = function(name) {
                return this.name === "test" ? "default" : this.name;
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
        <dom-module id="my-element">
          <template>
            <h1 title="[[_expr0(name)]]">Hello [[_expr1(name)]]</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "my-element";
              }
              static get properties() {
                return {
                  name: String
                };
              }
              _expr0(name) {
                return document.title + this.name;
              }
              _expr1(name) {
                return this.name === "test" ? "default" : this.name;
              }
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
      );
    });
  });
  describe("should detect mixins declared in various ways", () => {
    const component1 = transpile(`const mixinA = (Super1) => class extends Super1 { prop: string; };`);
    const component2 = transpile(`const mixinA = (Super2) => class extends otherMixin(Super2) { prop: string; };`);
    const component3 = transpile(`const mixinA = (Super3) => class extends otherMixin(anotherMixin(Super3)) { prop: string; };`);
    const component4 = transpile(`const mixinA = (Super4) => transformer(class extends Super4  { prop: string; });`);
    const component5 = transpile(`const mixinA = (Super5) => { return class extends Super5 { prop: string; }; };`);
    const component6 = transpile(`const mixinA = function (Super6) { return class extends Super6 { prop: string; }; };`);
    const component7 = transpile(`const mixinA = function mixinA(Super7) { return class extends Super7 { prop: string; }; };`);
    const component8 = transpile(`const mixinA = Polymer.dedupingMixin((Super8) => class extends Super8 { prop: string; });`);
    const component9 = transpile(`function mixinA(Super9) { return class extends Super9 { prop: string; }; };`);
    const component10 = transpile(`MyNamespace.MyMixin = Polymer.dedupingMixin((Super10) => class extends Super10 { prop: string; });`);
    const component11 = transpile(`MyNamespace.MyMixin = (Super11) => class extends Super11 { prop: string; };`);
    it("es5", () => {
      expect(component1.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super1));
          };
        </script>
      `);
      expect(component2.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super2) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(otherMixin(Super2)));
          };
        </script>
      `);
      expect(component3.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super3) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(otherMixin(anotherMixin(Super3))));
          };
        </script>
      `);
      expect(component4.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super4) {
            return transformer((function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super4)));
          };
        </script>
      `);
      expect(component5.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super5) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super5));
          };
        </script>
      `);
      expect(component6.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super6) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super6));
          };
        </script>
      `);
      expect(component7.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function mixinA(Super7) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super7));
          };
        </script>
      `);
      expect(component8.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = Polymer.dedupingMixin(function(Super8) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super8));
          });
        </script>
      `);
      expect(component9.es5).to.equalIgnoreSpaces(`
        <script>
          function mixinA(Super9) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super9));
          };
        </script>
      `);
      expect(component10.es5).to.equalIgnoreSpaces(`
        <script>
          MyNamespace.MyMixin = Polymer.dedupingMixin(function(Super10) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super10));
          });
        </script>
      `);
      expect(component11.es5).to.equalIgnoreSpaces(`
        <script>
          MyNamespace.MyMixin = function(Super11) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop: String
                  };
                },
                enumerable: true,
                configurable: true
              });
              return class_1;
            }(Super11));
          };
        </script>
      `);
    });
    it("es6", () => {
      expect(component1.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => class extends Super1 {
            static get properties() {
              return {
                prop: String
              };
            }
          };
        </script>
      `);
      expect(component2.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super2) => class extends otherMixin(Super2) {
            static get properties() {
              return {
                prop: String
              };
            }
          };
        </script>
      `);
      expect(component3.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super3) => class extends otherMixin(anotherMixin(Super3)) {
            static get properties() {
              return {
                prop: String
              };
            }
          };
        </script>
      `);
      expect(component4.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super4) => transformer(class extends Super4 {
            static get properties() {
              return {
                prop: String
              };
            }
          });
        </script>
      `);
      expect(component5.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super5) => {
            return class extends Super5 {
              static get properties() {
                return {
                  prop: String
                };
              }
            };
          };
        </script>
      `);
      expect(component6.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = function (Super6) {
            return class extends Super6 {
             static get properties() {
              return {
                prop: String
              };
             }
            };
          };
        </script>
      `);
      expect(component7.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = function mixinA(Super7) {
            return class extends Super7 {
             static get properties() {
              return {
                prop: String
              };
             }
            };
          };
        </script>
      `);
      expect(component8.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = Polymer.dedupingMixin((Super8) => class extends Super8 {
            static get properties() {
              return {
                prop: String
              };
            }
          });
        </script>
      `);
      expect(component9.es6).to.equalIgnoreSpaces(`
        <script>
          function mixinA(Super9) {
            return class extends Super9 {
              static get properties() {
                return {
                  prop: String
                };
              }
            };
          };
        </script>
      `);
      expect(component10.es6).to.equalIgnoreSpaces(`
        <script>
          MyNamespace.MyMixin = Polymer.dedupingMixin((Super10) => class extends Super10 {
            static get properties() {
              return {
                prop: String
              };
            }
          });
        </script>
      `);
      expect(component11.es6).to.equalIgnoreSpaces(`
        <script>
          MyNamespace.MyMixin = (Super11) => class extends Super11 {
            static get properties() {
              return {
                prop: String
              };
            }
          };
        </script>
      `);
    });
  });
  describe("should upgrade mixins within mixed content", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";
      @CustomElement()
      export class MyElement extends Polymer.Element {
        template() {
          return \`<h1>Hello World</h1>\`;
        }
      }
      const mixinA = (Base) => class extends Base { prop: string; };`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
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

            var mixinA = function(Base) {
              return (function(_super) {
                __extends(class_1, _super);

                function class_1() {
                  return _super !== null && _super.apply(this, arguments) || this;
                }
                Object.defineProperty(class_1, "properties", {
                  get: function() {
                    return {
                      prop: String
                    };
                  },
                  enumerable: true,
                  configurable: true
                });
                return class_1;
              }(Base));
            };
          </script>
        </dom-module>
      `);
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
            }
            customElements.define(MyElement.is, MyElement);

            const mixinA = (Base) => class extends Base {
              static get properties() {
                return {
                  prop: String
                };
              }
            };
          </script>
        </dom-module>`
      );
    });
  });
  describe("should recognize computed properties within mixin declaration", () => {
    const component = transpile(`const mixinA = (Super1) => class extends Super1 {
      name: string;
      age: number;
      cards: Array<string>;

      @compute((name: string) => \`Hi, I am \${name}\`) greetings: string;
      @compute((value: number) => value >= 18, [ "age" ]) isAdult: boolean;
      @compute((age: number, name: string) => \`\${name} is \${age} years old\`) aboutMe: string;
      @compute((size) => size, [ "cards.length" ]) collectionSize: number;
      @compute('_summary', [ "name", "cards.length" ]) summary: string;

      private _summary(name, collectionSize) {
          return \`\${name} has \${collectionSize} cards\`;
      }
    };`);
    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    name: String,
                    age: Number,
                    cards: Array,
                    greetings: {
                      type: String,
                      computed: "_greetingsResolver(name)"
                    },
                    isAdult: {
                      type: Boolean,
                      computed: "_isAdultResolver(age)"
                    },
                    aboutMe: {
                      type: String,
                      computed: "_aboutMeResolver(age, name)"
                    },
                    collectionSize: {
                      type: Number,
                      computed: "_collectionSizeResolver(cards.length)"
                    },
                    summary: {
                      type: String,
                      computed: "_summary(name, cards.length)"
                    }
                  };
                },
                enumerable: true,
                configurable: true
              });
              class_1.prototype._summary = function(name, collectionSize) {
                return name + " has " + collectionSize + " cards";
              };
              class_1.prototype._greetingsResolver = function(name) {
                return "Hi, I am " + name;
              };
              class_1.prototype._isAdultResolver = function(value) {
                return value >= 18;
              };
              class_1.prototype._aboutMeResolver = function(age, name) {
                return name + " is " + age + " years old";
              };
              class_1.prototype._collectionSizeResolver = function(size) {
                return size;
              };
              return class_1;
            }(Super1));
          };
        </script>
      `);
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => class extends Super1 {
            static get properties() {
              return {
                name: String,
                age: Number,
                cards: Array,
                greetings: {
                    type: String,
                    computed: "_greetingsResolver(name)"
                },
                isAdult: {
                    type: Boolean,
                    computed: "_isAdultResolver(age)"
                },
                aboutMe: {
                    type: String,
                    computed: "_aboutMeResolver(age, name)"
                },
                collectionSize: {
                    type: Number,
                    computed: "_collectionSizeResolver(cards.length)"
                },
                summary: {
                    type: String,
                    computed: "_summary(name, cards.length)"
                }
              };
            }
            _summary(name, collectionSize) {
              return \`\${name} has \${collectionSize} cards\`;
            }
            _greetingsResolver(name) {
              return \`Hi, I am \${name}\`;
            }
            _isAdultResolver(value) {
              return value >= 18;
            }
            _aboutMeResolver(age, name) {
              return \`\${name} is \${age} years old\`;
            }
            _collectionSizeResolver(size) {
              return size;
            }
          };
        </script>
      `);
    });
  });
  describe("should recognize computed properties within mixin declaration", () => {
    const component1 = transpile(`const mixinA = (Super1) => class extends Super1 {
      @listen('click') handler(event) {
        console.log('You clicked me!');
      }
      @listen('custom-init-event', true) init(event) {
        console.log('I am only triggered once');
      }
    };`);
    const component2 = transpile(`const mixinA = (Super1) => class extends Super1 {
      @listen('click') handler(event) {
        console.log('You clicked me!');
      }
      handleEvent(ev) {
        console.log("event handled", event);
      }
      connectedCallback() {
        console.log('connected');
        this.addEventListener('click', this);
      }
      disconnectedCallback() {
        console.log('disconnected');
        this.removeEventListener('click', this);
      }
    };`);
    it("es5", () => {
      expect(component1.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              class_1.prototype.handler = function(event) {
                console.log('You clicked me!');
              };
              class_1.prototype.init = function(event) {
                console.log('I am only triggered once');
              };
              class_1.prototype.handleEvent = function(event) {
                if (event.type === 'click') {
                  this.handler(event);
                }
                if (event.type === 'custom-init-event' && !this[" initTriggered"]) {
                  this.init(event);
                  this[" initTriggered"] = true;
                }
              };
              class_1.prototype.connectedCallback = function() {
                this.addEventListener('click', this);
                this.addEventListener('custom-init-event', this);
              };
              class_1.prototype.disconnectedCallback = function() {
                this.removeEventListener('click', this);
              };
              return class_1;
            }(Super1));
          };
        </script>
      `);
      expect(component2.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              class_1.prototype.handler = function(event) {
                console.log('You clicked me!');
              };
              class_1.prototype.handleEvent = function(ev) {
                console.log("event handled", event);
                if (ev.type === 'click') {
                  this.handler(ev);
                }
              };
              class_1.prototype.connectedCallback = function() {
                console.log('connected');
                this.addEventListener('click', this);
              };
              class_1.prototype.disconnectedCallback = function() {
                console.log('disconnected');
                this.removeEventListener('click', this);
              };
              return class_1;
            }(Super1));
          };
        </script>
      `);
    });
    it("es6", () => {
      expect(component1.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => class extends Super1 {
            handler(event) {
              console.log('You clicked me!');
            }
            init(event) {
              console.log('I am only triggered once');
            }
            handleEvent(event) {
              if (event.type === 'click') {
                this.handler(event);
              }
              if (event.type === 'custom-init-event' && !this[" initTriggered"]) {
                this.init(event);
                this[" initTriggered"] = true;
              }
            }
            connectedCallback() {
              this.addEventListener('click', this);
              this.addEventListener('custom-init-event', this);
            }
            disconnectedCallback() {
              this.removeEventListener('click', this);
            }
          };
        </script>
      `);
      expect(component2.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => class extends Super1 {
            handler(event) {
              console.log('You clicked me!');
            }
            handleEvent(ev) {
              console.log("event handled", event);
                if (ev.type === 'click') {
                this.handler(ev);
              }
            }
            connectedCallback() {
              console.log('connected');
              this.addEventListener('click', this);
            }
            disconnectedCallback() {
              console.log('disconnected');
              this.removeEventListener('click', this);
            }
          };
        </script>
      `);
    });
  });
  describe("should recognize observers within mixin declaration", () => {
    const component1 = transpile(`const mixinA = (Super1) => class extends Super1 {
      prop1: string;
      prop2: number;
      readonly prop3: boolean;

      someMethod() {}
      @observe('prop1', 'prop2') observer1(prop1, prop2) {}
      @observe('prop1') observer2(prop1) {}
      @observe('prop3') observer3(prop3) {}
      @observe() observer4(prop2) {}
    };`);
    const component2 = transpile(`const mixinA = (Super1) => {
      return class extends Super1 {
        prop1: string;
        prop2: number;
        readonly prop3: boolean;

        someMethod() {}
        @observe('prop1', 'prop2') observer1(prop1, prop2) {}
        @observe('prop1') observer2(prop1) {}
        @observe('prop3') observer3(prop3) {}
        @observe() observer4(prop2) {}
      };
    };`);
    const component3 = transpile(`const mixinA = (Super1) => transformer(class extends Super1 {
      prop1: string;
      prop2: number;
      readonly prop3: boolean;

      someMethod() {}
      @observe('prop1', 'prop2') observer1(prop1, prop2) {}
      @observe('prop1') observer2(prop1) {}
      @observe('prop3') observer3(prop3) {}
      @observe() observer4(prop2) {}
    };)`);
    it("es5", () => {
      expect(component1.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop1: {
                      type: String,
                      observer: "observer2"
                    },
                    prop2: {
                      type: Number,
                      observer: "observer4"
                    },
                    prop3: {
                      type: Boolean,
                      observer: "observer3",
                      readOnly: true
                    }
                  };
                },
                enumerable: true,
                configurable: true
              });
              Object.defineProperty(class_1, "observers", {
                get: function() {
                  return [
                    "observer1(prop1, prop2)"
                  ];
                },
                enumerable: true,
                configurable: true
              });
              class_1.prototype.someMethod = function() {};
              class_1.prototype.observer1 = function(prop1, prop2) {};
              class_1.prototype.observer2 = function(prop1) {};
              class_1.prototype.observer3 = function(prop3) {};
              class_1.prototype.observer4 = function(prop2) {};
              return class_1;
            }(Super1));
          };
        </script>
      `);
      expect(component2.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop1: {
                      type: String,
                      observer: "observer2"
                    },
                    prop2: {
                      type: Number,
                      observer: "observer4"
                    },
                    prop3: {
                      type: Boolean,
                      observer: "observer3",
                      readOnly: true
                    }
                  };
                },
                enumerable: true,
                configurable: true
              });
              Object.defineProperty(class_1, "observers", {
                get: function() {
                  return [
                    "observer1(prop1, prop2)"
                  ];
                },
                enumerable: true,
                configurable: true
              });
              class_1.prototype.someMethod = function() {};
              class_1.prototype.observer1 = function(prop1, prop2) {};
              class_1.prototype.observer2 = function(prop1) {};
              class_1.prototype.observer3 = function(prop3) {};
              class_1.prototype.observer4 = function(prop2) {};
              return class_1;
            }(Super1));
          };
        </script>
      `);
      expect(component3.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return transformer((function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop1: {
                      type: String,
                      observer: "observer2"
                    },
                    prop2: {
                      type: Number,
                      observer: "observer4"
                    },
                    prop3: {
                      type: Boolean,
                      observer: "observer3",
                      readOnly: true
                    }
                  };
                },
                enumerable: true,
                configurable: true
              });
              Object.defineProperty(class_1, "observers", {
                get: function() {
                  return [
                    "observer1(prop1, prop2)"
                  ];
                },
                enumerable: true,
                configurable: true
              });
              class_1.prototype.someMethod = function() {};
              class_1.prototype.observer1 = function(prop1, prop2) {};
              class_1.prototype.observer2 = function(prop1) {};
              class_1.prototype.observer3 = function(prop3) {};
              class_1.prototype.observer4 = function(prop2) {};
              return class_1;
            }(Super1)));
          };
        </script>
      `);
    });
    it("es6", () => {
      expect(component1.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => class extends Super1 {
            static get properties() {
              return {
                prop1: {
                    type: String,
                    observer: "observer2"
                },
                prop2: {
                    type: Number,
                    observer: "observer4"
                },
                prop3: {
                    type: Boolean,
                    observer: "observer3",
                    readOnly: true
                }
              };
            }
            static get observers() {
              return [
                "observer1(prop1, prop2)"
              ];
            }
            someMethod() {}
            observer1(prop1, prop2) {}
            observer2(prop1) {}
            observer3(prop3) {}
            observer4(prop2) {}
          };
        </script>
      `);
      expect(component2.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => {
            return class extends Super1 {
              static get properties() {
                return {
                  prop1: {
                      type: String,
                      observer: "observer2"
                  },
                  prop2: {
                      type: Number,
                      observer: "observer4"
                  },
                  prop3: {
                      type: Boolean,
                      observer: "observer3",
                      readOnly: true
                  }
                };
              }
              static get observers() {
                return [
                  "observer1(prop1, prop2)"
                ];
              }
              someMethod() {}
              observer1(prop1, prop2) {}
              observer2(prop1) {}
              observer3(prop3) {}
              observer4(prop2) {}
            };
          };
        </script>
      `);
      expect(component3.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => transformer(class extends Super1 {
            static get properties() {
              return {
                prop1: {
                    type: String,
                    observer: "observer2"
                },
                prop2: {
                    type: Number,
                    observer: "observer4"
                },
                prop3: {
                    type: Boolean,
                    observer: "observer3",
                    readOnly: true
                }
              };
            }
            static get observers() {
              return [
                "observer1(prop1, prop2)"
              ];
            }
            someMethod() {}
            observer1(prop1, prop2) {}
            observer2(prop1) {}
            observer3(prop3) {}
            observer4(prop2) {}
          });
        </script>
      `);
    });
  });
  describe("should recognize attributes and notify-able properties within mixins", () => {
    const component = transpile(`const mixinA = (Super1) => class extends Super1 {
      @attr() prop1: string;
      @notify() prop2: number;
      readonly prop3: boolean;
      @attr() @notify() @compute((prop1, prop2) => prop1.repeat(prop2)) prop4: string;
    };`);
    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <script>
          var mixinA = function(Super1) {
            return (function(_super) {
              __extends(class_1, _super);

              function class_1() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(class_1, "properties", {
                get: function() {
                  return {
                    prop1: {
                      type: String,
                      reflectToAttribute: true
                    },
                    prop2: {
                      type: Number,
                      notify: true
                    },
                    prop3: {
                      type: Boolean,
                      readOnly: true
                    },
                    prop4: {
                      type: String,
                      computed: "_prop4Resolver(prop1, prop2)",
                      notify: true,
                      reflectToAttribute: true
                    }
                  };
                },
                enumerable: true,
                configurable: true
              });
              class_1.prototype._prop4Resolver = function (prop1, prop2) {
                  return prop1.repeat(prop2);
              };
              return class_1;
            }(Super1));
          };
        </script>
      `);
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <script>
          const mixinA = (Super1) => class extends Super1 {
            static get properties() {
              return {
                prop1: {
                  type: String,
                  reflectToAttribute: true
                },
                prop2: {
                  type: Number,
                  notify: true
                },
                prop3: {
                  type: Boolean,
                  readOnly: true
                },
                prop4: {
                  type: String,
                  computed: "_prop4Resolver(prop1, prop2)",
                  notify: true,
                  reflectToAttribute: true
                }
              };
            }
            _prop4Resolver(prop1, prop2) {
              return prop1.repeat(prop2);
            }
          };
        </script>
      `);
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
  describe("should compile components with async methods and await inside methods", () => {
    const component = transpile(`
    import 'polymer:polymer.html';
    import { CustomElement } from 'twc/polymer';

    @CustomElement()
    export class MyElement extends Polymer.Element {
      async ready() {
        await this._initialize();
      }

      async _initialize() {
        return new Promise((res) => setTimeout(res, 1000, true));
      }
    }`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <link rel="import" href="../polymer/polymer.html">
        <dom-module id="my-element">
          <script>
            var MyElement = (function(_super) {
              __extends(MyElement, _super);

              function MyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(MyElement, "is", {
                get: function() {
                  return 'my-element';
                },
                enumerable: true,
                configurable: true
              });
              MyElement.prototype.ready = function() {
                return __awaiter(this, void 0, void 0, function() {
                  return __generator(this, function(_a) {
                    switch (_a.label) {
                      case 0:
                        return [4 /*yield*/ , this._initialize()];
                      case 1:
                        _a.sent();
                        return [2 /*return*/ ];
                    }
                  });
                });
              };
              MyElement.prototype._initialize = function() {
                return __awaiter(this, void 0, void 0, function() {
                  return __generator(this, function(_a) {
                    return [2 /*return*/ , new Promise(function(res) {
                      return setTimeout(res, 1000, true);
                    })];
                  });
                });
              };
              return MyElement;
            }(Polymer.Element));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`);
    });
    it("es6", () => {
      expect(component.es6).to.equalIgnoreSpaces(`
        <link rel="import" href="../polymer/polymer.html">
        <dom-module id="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return 'my-element';
              }
              ready() {
                return __awaiter(this, void 0, void 0, function*() {
                  yield this._initialize();
                });
              }
              _initialize() {
                return __awaiter(this, void 0, void 0, function*() {
                  return new Promise((res) => setTimeout(res, 1000, true));
                });
              }
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`);
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
      export class MyElement extends Polymer.mixinBehaviors([ MyBehavior ], Polymer.Element) {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <link rel="import" href="../../iron-resizable-behavior/iron-resizable-behavior.html">
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
  describe("should not emit types and declarations", () => {
    const component = transpile(`
      import { CustomElement } from "twc/polymer";

      declare var A: any
      declare let B: any
      declare const C: any
      declare const D: Array<number>;
      declare function E() {}

      interface F {
        a: string;
      }

      type G = number | string;

      @CustomElement()
      export class MyElement extends Polymer.Element {}`);

    it("es5", () => {
      expect(component.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
        <dom-module id="my-element">
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
  describe("Decorators", () => {
    describe("@CustomElement", () => {
      describe("should use MutableData or OptionalMutableData according to config", () => {
        const component1 = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({mutableData: "on"})
      export class MyElement extends Polymer.Element {}`);

        const component2 = transpile(`
      import { CustomElement, template } from "twc/polymer";

      @CustomElement({mutableData: "optional"})
      export class MyElement extends Polymer.Element {}`);

        it("es5", () => {
          expect(component1.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
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
            }(Polymer.MutableData(Polymer.Element)));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
          );

          expect(component2.es5).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
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
            }(Polymer.OptionalMutableData(Polymer.Element)));
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
          );
        });
        it("es6", () => {
          expect(component1.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            class MyElement extends Polymer.MutableData(Polymer.Element) {
              static get is() {
                return "my-element";
              }
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
          );

          expect(component2.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            class MyElement extends Polymer.OptionalMutableData(Polymer.Element) {
              static get is() {
                return "my-element";
              }
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
          );
        });
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
            var MyElement = (function(_super) {
              __extends(MyElement, _super);

              function MyElement() {
                return _super !== null && _super.apply(this, arguments) || this;
              }
              Object.defineProperty(MyElement, "is", {
                get: function() {
                  return "other-name";
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
        <dom-module id="other-name">
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "other-name";
              }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module id="my-element">
          <template>
            <h1>Hello World</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "my-element";
              }
            }
            customElements.define(MyElement.is, MyElement);
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
            <style>
               :host {
                color: red;
              }
            </style>
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
        <dom-module id="my-element">
          <template>
            <style>
               :host {
                color: red;
              }
            </style>
            <style include="shared-style"></style>
            <h1>Hello World</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "my-element";
              }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module id="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "my-element";
              }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module id="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() { return "my-element"; }
              static get properties() {
                return {
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
                };
              }
            }
            customElements.define(MyElement.is, MyElement);
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
        <dom-module id="my-element">
          <template strip-whitespace>
            <h1>Hello World</h1>
          </template>
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "my-element";
              }
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
          );
        });
      });
    });
    describe("@listen", () => {
      describe("should add an event listener to connected callback", () => {
        const component = transpile(`
          import { CustomElement, listen } from "twc/polymer";
          @CustomElement()
          export class MyElement extends Polymer.Element {
            @listen("click") fun1() {}
            @listen("tap") fun2() {}
            @listen("click", true) fun3() {}
            @listen("tap", true) fun4() {}
          }`);

        it("es5", () => {
          expect(component.es5).to.equalIgnoreSpaces(`
            <dom-module id="my-element">
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
                  MyElement.prototype.connectedCallback = function() {
                    var _this = this;
                    Polymer.Gestures.addListener(this, "tap", this._fun4Bound = function() {
                      var args = [];
                      for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                      }
                      _this.fun4.apply(_this, args);
                      Polymer.Gestures.removeListener(_this, "tap", _this._fun4Bound);
                    });
                    this.addEventListener("click", this._fun3Bound = function() {
                      var args = [];
                      for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                      }
                      _this.fun3.apply(_this, args);
                      _this.removeEventListener("click", _this._fun3Bound);
                    });
                    Polymer.Gestures.addListener(this, "tap", this._fun2Bound = this.fun2.bind(this));
                    this.addEventListener("click", this._fun1Bound = this.fun1.bind(this));
                  };
                  MyElement.prototype.disconnectedCallback = function() {
                    Polymer.Gestures.removeListener(this, "tap", this._fun2Bound);
                    this.removeEventListener("click", this._fun1Bound);
                  };
                  MyElement.prototype.fun1 = function() {};
                  MyElement.prototype.fun2 = function() {};
                  MyElement.prototype.fun3 = function() {};
                  MyElement.prototype.fun4 = function() {};
                  return MyElement;
                }(Polymer.Element));
                customElements.define(MyElement.is, MyElement);
              </script>
            </dom-module>`
          );
        });
        it("es6", () => {
          expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "my-element";
              }
              connectedCallback() {
                Polymer.Gestures.addListener(this, "tap", this._fun4Bound = (...args) => {
                  this.fun4(...args);
                  Polymer.Gestures.removeListener(this, "tap", this._fun4Bound);
                });
                this.addEventListener("click", this._fun3Bound = (...args) => {
                  this.fun3(...args);
                  this.removeEventListener("click", this._fun3Bound);
                });
                Polymer.Gestures.addListener(this, "tap", this._fun2Bound = this.fun2.bind(this));
                this.addEventListener("click", this._fun1Bound = this.fun1.bind(this));
              }
              disconnectedCallback() {
                Polymer.Gestures.removeListener(this, "tap", this._fun2Bound);
                this.removeEventListener("click", this._fun1Bound);
              }
              fun1() {}
              fun2() {}
              fun3() {}
              fun4() {}
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
          );
        });
      });
      describe("should not override provided connectedCallback/disconnectedCallback", () => {
        const component = transpile(`
          import { CustomElement, listen } from "twc/polymer";
          @CustomElement()
          export class MyElement extends Polymer.Element {
            connectedCallback() {
              console.log("connected");
            }
            @listen("click") fun1() {}
            disconnectedCallback() {
              console.log("disconnected");
            }
          }`);

        it("es5", () => {
          expect(component.es5).to.equalIgnoreSpaces(`
            <dom-module id="my-element">
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
                  MyElement.prototype.connectedCallback = function() {
                    this.addEventListener("click", this._fun1Bound = this.fun1.bind(this));
                    console.log("connected");
                  };
                  MyElement.prototype.disconnectedCallback = function() {
                    this.removeEventListener("click", this._fun1Bound);
                    console.log("disconnected");
                  };
                  MyElement.prototype.fun1 = function() {};
                  return MyElement;
                }(Polymer.Element));
                customElements.define(MyElement.is, MyElement);
              </script>
            </dom-module>`
          );
        });
        it("es6", () => {
          expect(component.es6).to.equalIgnoreSpaces(`
        <dom-module id="my-element">
          <script>
            class MyElement extends Polymer.Element {
              static get is() {
                return "my-element";
              }
              connectedCallback() {
                this.addEventListener("click", this._fun1Bound = this.fun1.bind(this));
                console.log("connected");
              }
              disconnectedCallback() {
                this.removeEventListener("click", this._fun1Bound);
                console.log("disconnected");
              }
              fun1() {}
            }
            customElements.define(MyElement.is, MyElement);
          </script>
        </dom-module>`
          );
        });
      });
    });
  });
});
