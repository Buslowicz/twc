/* tslint:disable:no-unused-expression */
import { expect } from 'chai';
import {
  BinaryExpression, ClassDeclaration, createSourceFile, PropertyDeclaration, ScriptTarget, SyntaxKind,
  UnionOrIntersectionTypeNode, VariableStatement
} from 'typescript';
import { buildPropertyObject } from '../builder';
import { hasDecorator, hasModifier, isProperty, notPrivate, notStatic } from '../helpers';
import {
  getTypeAndValue, parseDeclarationInitializer, parseDeclarationType, parseExpression, parseUnionOrIntersectionType,
  typeToSimpleKind
} from '../parsers';

describe('parsers', () => {
  function parse(src) {
    const statement: VariableStatement = createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as any;
    return statement.declarationList.declarations[ 0 ] as any as PropertyDeclaration;
  }

  describe('::typeToSimpleKind()', () => {
    it('should parse simple types', () => {
      expect(typeToSimpleKind(parse(`let p;`).type)).to.equal(SyntaxKind.Unknown);
      expect(typeToSimpleKind(parse(`let p: string;`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(typeToSimpleKind(parse(`let p: number;`).type)).to.equal(SyntaxKind.NumberKeyword);
      expect(typeToSimpleKind(parse(`let p: boolean;`).type)).to.equal(SyntaxKind.BooleanKeyword);
      expect(typeToSimpleKind(parse(`let p: Array<boolean>;`).type)).to.equal(SyntaxKind.ArrayType);
    });
    it('should convert all TypeReferences to ObjectKeyword', () => {
      expect(typeToSimpleKind(parse(`let p: Date;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(typeToSimpleKind(parse(`let p: Object;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(typeToSimpleKind(parse(`let p: PolymerElement;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(typeToSimpleKind(parse(`let p: ENUM;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
    it('should ignore all transparent types and convert them to Unknown type', () => {
      expect(typeToSimpleKind(parse(`let p: null;`).type)).to.equal(SyntaxKind.Unknown);
      expect(typeToSimpleKind(parse(`let p: undefined;`).type)).to.equal(SyntaxKind.Unknown);
      expect(typeToSimpleKind(parse(`let p: any;`).type)).to.equal(SyntaxKind.Unknown);
      expect(typeToSimpleKind(parse(`let p: void;`).type)).to.equal(SyntaxKind.Unknown);
      expect(typeToSimpleKind(parse(`let p: never;`).type)).to.equal(SyntaxKind.Unknown);
    });
    it('should parse literal types', () => {
      expect(typeToSimpleKind(parse(`let p: boolean[];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(typeToSimpleKind(parse(`let p: [ boolean ];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(typeToSimpleKind(parse(`let p: [ string, number ];`).type)).to.equal(SyntaxKind.ArrayType);

      expect(typeToSimpleKind(parse(`let p: 'test';`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(typeToSimpleKind(parse(`let p: { a: boolean, b: string };`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(typeToSimpleKind(parse(`let p: () => string;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('::parseUnionOrIntersectionType()', () => {
    it('should parse unions with same types', () => {
      expect(parseUnionOrIntersectionType(parse(`let p: string | string;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: number | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: boolean | boolean;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: Array<any> | Array<any>;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ArrayType);
    });
    it('should ignore transparent types when parsing unions', () => {
      expect(parseUnionOrIntersectionType(parse(`let p: string | null;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: null | string;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: string | any;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
    });
    it('should return ObjectKeyword for mixed types', () => {
      expect(parseUnionOrIntersectionType(parse(`let p: string | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
    });
    it('should parse literals unions', () => {
      expect(parseUnionOrIntersectionType(parse(`let p: 'a' | 'b';`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: 1 | 2;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: 'a' | 1;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('::parseExpressionType()', () => {
    it('should understand simple numeral expressions', () => {
      expect(parseExpression(parse('let p = 5 + 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 * 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 ** 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 * 5 * 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 - 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 / 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 % 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 & 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 | 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 ^ 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = ~5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 << 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 >> 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 >>> 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
    });
    it('should understand simple boolean expressions', () => {
      expect(parseExpression(parse('let p = 5 == 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 === 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 != 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 !== 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 < 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 <= 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 > 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 >= 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.BooleanKeyword);
    });
    it('should understand simple text expressions', () => {
      expect(parseExpression(parse('let p = "a" + "b";').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.StringKeyword);
    });
    it('should understand mixed types simple expressions', () => {
      expect(parseExpression(parse('let p = "a" + 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.StringKeyword);
      expect(parseExpression(parse('let p = true * 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = window.innerWidth * 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = window.innerWidth + 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = (a || b) + 5;').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = document.title + " string";').initializer as BinaryExpression))
        .to.deep.equal(SyntaxKind.StringKeyword);
    });
  });
  describe('::parseDeclarationType()', () => {
    it('should direct unions and intersections to `parseUnionOrIntersectionType` function', () => {
      expect(parseDeclarationType(parse(`let p: 'test1' | 'test2';`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parse(`let p: string | null;`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parse(`let p: boolean | true;`))).to.equal(SyntaxKind.BooleanKeyword);
      expect(parseDeclarationType(parse(`let p: string | number;`))).to.equal(SyntaxKind.ObjectKeyword);
      expect(parseDeclarationType(parse(`let p: Date & Object;`))).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('::parseDeclarationInitializer()', () => {
    it('should return no value and type Unknown if there is no initializer', () => {
      expect(parseDeclarationInitializer(parse('let p;'))).to.deep.equal({
        type: SyntaxKind.Unknown
      });
      expect(parseDeclarationInitializer(parse('let p: string;'))).to.deep.equal({
        type: SyntaxKind.Unknown
      });
    });
    it('should get type and value from simple literal initializer', () => {
      expect(parseDeclarationInitializer(parse('let p = "test";'))).to.deep.equal({
        type: SyntaxKind.StringKeyword, value: '"test"'
      });
      expect(parseDeclarationInitializer(parse('let p = true;'))).to.deep.equal({
        type: SyntaxKind.BooleanKeyword, value: true
      });
      expect(parseDeclarationInitializer(parse('let p = 10;'))).to.deep.equal({
        type: SyntaxKind.NumberKeyword, value: 10
      });
      expect(parseDeclarationInitializer(parse('let p = `25`;'))).to.deep.equal({
        type: SyntaxKind.StringKeyword, value: '`25`'
      });
    });
    it('should get type and value from complex initializer and wrap value with an anonymous function', () => {
      let initAndType = parseDeclarationInitializer(parse('let p = `${25}`;'));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return `${25}`; }');

      initAndType = parseDeclarationInitializer(parse('let p = { a: true };'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return { a: true }; }');

      initAndType = parseDeclarationInitializer(parse('let p = ENUM.A;'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return ENUM.A; }');

      initAndType = parseDeclarationInitializer(parse('let p = () => "test";'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return () => "test"; }');

      initAndType = parseDeclarationInitializer(parse('let p = new Date();'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return new Date(); }');

      initAndType = parseDeclarationInitializer(parse('let p = [ 1, 2, 3 ];'));
      expect(initAndType.type).to.equal(SyntaxKind.ArrayType);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return [ 1, 2, 3 ]; }');

      initAndType = parseDeclarationInitializer(parse('let p = new Array(10);'));
      expect(initAndType.type).to.equal(SyntaxKind.ArrayType);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return new Array(10); }');
    });
    it('should get type and value from expressions', () => {
      let initAndType = parseDeclarationInitializer(parse('let p = 5 * 5 * 5;'));
      expect(initAndType.type).to.equal(SyntaxKind.NumberKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return 5 * 5 * 5; }');

      initAndType = parseDeclarationInitializer(parse('let p = "test" + "test";'));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return "test" + "test"; }');

      initAndType = parseDeclarationInitializer(parse('let p = 5 * innerWidth;'));
      expect(initAndType.type).to.equal(SyntaxKind.NumberKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return 5 * innerWidth; }');
    });
    it('should fallback to ObjectKeyword if no type was recognized', () => {
      let initAndType = parseDeclarationInitializer(parse('let p = window && window.opener;'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' '))
        .to.equal('function () { return window && window.opener; }');

      initAndType = parseDeclarationInitializer(parse('let p = (window && window.opener);'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' '))
        .to.equal('function () { return (window && window.opener); }');
    });
  });
  describe('::getTypeAndValue()', () => {
    it('should prefer implicit type over deducted one', () => {
      expect(getTypeAndValue(parse('let p: number = null;')))
        .to.deep.equal({ type: SyntaxKind.NumberKeyword, value: null, isDate: false });
      expect(getTypeAndValue(parse('let p: number = undefined;')))
        .to.deep.equal({ type: SyntaxKind.NumberKeyword, value: undefined, isDate: false });

      const initAndType = getTypeAndValue(parse('let p: string = document.title;'));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return document.title; }');
    });
  });
});
describe('builders', () => {
  function parseClass(src) {
    return createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as ClassDeclaration;
  }

  describe('::buildPropertyObject()', () => {
    it('should parse class correctly and build valid property objects', () => {
      let parsed = parseClass(`class Test {
      public readonly t1: string = document.title;
      t2 = "test";
      t3: string;
      private helper: string;
      /** Some test property */
      test1: Date = Date.now();
      test2: Date = new Date();
      @attr @test('true') attr: string = null;
      @compute("compute", ["test1", "test2"]) computed1: string;
      @compute(function(t1: string, t2: string) { return t1 + t2; }, ["test1", 'test2']) computed2: string;
    }`);
      expect(getTypeAndValue(parsed.members[ 0 ] as PropertyDeclaration))
        .to.include({ type: SyntaxKind.StringKeyword }).and.include.keys('value');

      expect(hasModifier(parsed.members[ 0 ], SyntaxKind.ReadonlyKeyword)).to.be.true;
      expect(hasModifier(parsed.members[ 2 ], SyntaxKind.PublicKeyword)).to.be.false;
      expect(hasDecorator(parsed.members[ 6 ], 'attr')).to.be.true;
      expect(hasDecorator(parsed.members[ 6 ], 'notify')).to.be.false;
      expect(hasDecorator(parsed.members[ 7 ], 'compute')).to.be.true;
      expect(hasDecorator(parsed.members[ 8 ], 'compute')).to.be.true;

      let properties = parsed.members
        .filter(isProperty)
        .filter(notPrivate)
        .filter(notStatic)
        .map(buildPropertyObject);

      expect(properties).to.have.length(8);
      expect(properties.map((prop) => prop.config.toString())).to.deep.equal([
        't1: { type: String, value: function () {\nreturn document.title;\n}, readOnly: true }',
        't2: { type: String, value: "test" }',
        't3: String',
        '/** Some test property */\ntest1: { type: Date, value: function () {\nreturn Date.now();\n} }',
        'test2: { type: Date, value: function () {\nreturn new Date();\n} }',
        'attr: { type: String, reflectToAttribute: true }',
        'computed1: { type: String, computed: "compute(test1, test2)" }',
        'computed2: { type: String, computed: "_computed2Computed(test1, test2)" }'
      ]);
      expect(properties
        .map((prop) => prop
          .extras
          .methods
          .map((method) => method.toString())
        )
        .reduce((all, curr) => all.concat(curr), [])
      ).to.deep.equal([
        `_computed2Computed(t1,t2) {\nreturn t1 + t2;\n}`
      ]);
      parsed = parseClass(`
@component("input-math")
@template("<input>")
export class InputMath extends Polymer.Element {
  static HISTORY_SIZE: number = 20;

  static SYMBOLS_BASIC: ICmd[] = [
    { cmd: "\\sqrt", name: "√" },
    { cmd: "\\nthroot", name: "√", className: "n-sup" },
    { cmd: "\\int", name: "∫" },
    { cmd: "^", name: "n", className: "sup" },
    { cmd: "_", name: "n", className: "sub" },
    { cmd: "\\rightarrow", name: "→" },
    { cmd: "\\infty", name: "∞" },
    { cmd: "\\neq", name: "≠" },
    { cmd: "\\degree", name: "°" },
    { cmd: "\\div", name: "÷" }
  ];

  static SYMBOLS_GREEK: ICmd[] = [
    { cmd: "\\lambda", name: "λ" },
    { cmd: "\\pi", name: "π" },
    { cmd: "\\mu", name: "μ" },
    { cmd: "\\sum", name: "Σ" },
    { cmd: "\\alpha", name: "α" },
    { cmd: "\\beta", name: "β" },
    { cmd: "\\gamma", name: "γ" },
    { cmd: "\\delta", name: "ᵟ", className: "big" },
    { cmd: "\\Delta", name: "Δ" }
  ];

  static SYMBOLS_PHYSICS: ICmd[] = [
    { cmd: "\\ohm", name: "Ω" },
    { cmd: "\\phi", name: "ᶲ", className: "big" }
  ];

  testValue: "yep"|"nope";

  @attr value: string|null = "";

  @notify symbols: ICmd[][] = [
    InputMath.SYMBOLS_BASIC,
    InputMath.SYMBOLS_GREEK
  ];

  showSymbols: string = "";

  private _history: string[];
  private _mathField: MathQuill.EditableField;
  private _observerLocked: boolean = false;
  private _freezeHistory: boolean = false;
  private _editor: HTMLElement = document.createElement("div");

  constructor() {
    super();
    var editor: HTMLElement = this._editor;
    editor.id = "editor";
    editor.classList.add("input-math");
    this[ "_mathField" ] = MathQuill.getInterface(2).MathField(editor, {
      spaceBehavesLikeTab: true,
      handlers: {
        edit: this._updateValue.bind(this)
      }
    });
  }

  ready(): void {
    this.insertBefore(this._editor, this.$.controls);
  }

  cmd(ev: PolymerEvent): void {
    this._mathField.cmd(ev.model.item.cmd).focus();
  }

  undo(): void {
    if (this._history && this._history.length > 0) {
      this._freezeHistory = true;
      this.value = this._history.pop();
      this._freezeHistory = false;
    }
  }

  @observe("value")
  valueChanged(value: string, prevValue: string): Array<{ test: boolean }> {
    this._updateHistory(prevValue);

    if (this._observerLocked) {
      return;
    }

    this._mathField.select().write(value);
    if (this._mathField.latex() === "") {
      this.undo();
    }
  }

  @observe("showSymbols")
  symbolsChanged(symbols: string): void {
    if (symbols) {
      this.symbols = symbols.split(",").map(groupName => {
        return InputMath[ "SYMBOLS_" + groupName.toUpperCase() ] || [];
      });
    }
  }

  @listen("keydown")
  keyShortcuts(ev: KeyboardEvent): void {
    if (ev.ctrlKey && ev.keyCode === 90) {
      this.undo();
    }
  }

  _updateValue(test: { a: () => void, b: any }): void {
    console.log(test);
    this._observerLocked = true;
    this.value = this._mathField.latex();
    this._observerLocked = false;
  }

  private _updateHistory(prevValue: string): void {
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
  }
}`);

      properties = parsed.members
        .filter(isProperty)
        .filter(notPrivate)
        .filter(notStatic)
        .map(buildPropertyObject);

      expect(properties).to.have.length(4);
    });
  });
});
