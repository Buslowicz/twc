/* tslint:disable:no-unused-expression */
import { expect } from 'chai';
import {
  BinaryExpression, CallExpression, ClassDeclaration, createSourceFile, FunctionExpression, Identifier,
  PrefixUnaryExpression, PropertyDeclaration, ScriptTarget, SyntaxKind, UnionOrIntersectionTypeNode, VariableStatement
} from 'typescript';
import {
  getDecorators, getFunction, hasDecorator, hasModifier, isBinaryExpression, isCallExpression, isGetter, isIdentifier,
  isMethod, isPrefixUnaryExpression, isPrivate, isProperty, isPublic, isSetter, isStatic, isTransparent, notGetter,
  notMethod, notPrivate, notProperty, notPublic, notSetter, notStatic, notTransparent, wrapValue
} from '../helpers';
// import { PolymerProperty, PolymerElement } from '../builder';
// import { hasDecorator, hasModifier, isProperty, notPrivate, notStatic } from '../helpers';
import {
  getFinalType, getSimpleKind, getTypeAndValue, parseDeclarationInitializer, parseDeclarationType, parseExpression,
  parseUnionOrIntersectionType
} from '../parsers';

describe('helpers', () => {
  function parse(src) {
    const statement: VariableStatement = createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as any;
    return statement.declarationList.declarations[ 0 ] as any as PropertyDeclaration;
  }

  function parseClass(src) {
    return createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as ClassDeclaration;
  }

  describe('isBinaryExpression()', () => {
    it('should check if expression is a binary expression', () => {
      const expr = parse('let p = 5 * 5;').initializer;
      if (isBinaryExpression(expr)) {
        const binExpr: BinaryExpression = expr;
        expect(binExpr).to.not.be.null;
        expect(binExpr).to.contain.keys('operatorToken');
      } else {
        expect(expr).to.equal('BinaryExpression');
      }
    });
  });
  describe('isPrefixUnaryExpression()', () => {
    it('should check if expression is prefix unary expression', () => {
      const expr = parse('let p = ~5;').initializer;
      if (isPrefixUnaryExpression(expr)) {
        const unaryExpr: PrefixUnaryExpression = expr;
        expect(unaryExpr).to.not.be.null;
        expect(unaryExpr).to.contain.keys('operator');
      } else {
        expect(expr).to.equal('PrefixUnaryExpression');
      }
    });
  });
  describe('isCallExpression()', () => {
    it('should check if expression is call expression', () => {
      const expr = parse('let p = test();').initializer;
      if (isCallExpression(expr)) {
        const callExpr: CallExpression = expr;
        expect(callExpr).to.not.be.null;
        expect(callExpr).to.contain.keys('arguments');
      } else {
        expect(expr).to.equal('CallExpression');
      }
    });
  });
  describe('isIdentifier()', () => {
    it('should check if expression is identifier', () => {
      const expr = parse('let p = undefined;').initializer;
      if (isIdentifier(expr)) {
        const identifier: Identifier = expr;
        expect(identifier).to.not.be.null;
        expect(identifier).to.contain.keys('originalKeywordKind');
      } else {
        expect(expr).to.equal('Identifier');
      }
    });
  });
  describe('hasModifier()', () => {
    it('should check if class member has a modifier', () => {
      expect(hasModifier(parseClass(`class T { readonly p; }`).members[ 0 ], SyntaxKind.ReadonlyKeyword)).to.be.true;
      expect(hasModifier(parseClass(`class T { public p; }`).members[ 0 ], SyntaxKind.PublicKeyword)).to.be.true;
      expect(hasModifier(parseClass(`class T { public p; }`).members[ 0 ], SyntaxKind.PrivateKeyword)).to.be.false;
    });
  });
  describe('hasDecorator()', () => {
    it('should check if class member has a decorator', () => {
      expect(hasDecorator(parseClass(`class T { @a p; }`).members[ 0 ], 'a')).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a @b p; }`).members[ 0 ], 'a')).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a @b p; }`).members[ 0 ], 'b')).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a() p; }`).members[ 0 ], 'a')).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a() p; }`).members[ 0 ], 'b')).to.be.false;
      expect(hasDecorator(parseClass(`class T { @a p; }`).members[ 0 ], 'b')).to.be.false;
    });
  });
  describe('getFunction()', () => {
    const functionExpression = parse(`let x = function(a, b) { return a + b; }`).initializer as FunctionExpression;
    it('should parse a function expression and return a function', () => {
      expect(getFunction(functionExpression).toString()).to.equal(`function(a,b) {\nreturn a + b;\n}`);
      expect(getFunction(functionExpression)(5, 10)).to.equal(15);
    });
    it('should return a function when provided returned expression as a string', () => {
      expect(getFunction('10 * 20').toString()).to.equal(`function() {\nreturn 10 * 20;\n}`);
    });
    it('should name a function if name was provided', () => {
      expect(getFunction(functionExpression, 'testFun').toString()).to.equal(`testFun(a,b) {\nreturn a + b;\n}`);
      expect(getFunction(functionExpression, 'testFun').name).to.equal('testFun');
    });
  });
  describe('getDecorators()', () => {
    it('should return a list of parsed decorators (name and arguments object)', () => {
      expect(getDecorators(parseClass(`class T { @a(1) @b({a: true, b: 'test'}) @c p; }`).members[ 0 ])).to.deep.equal([
        { name: 'a', arguments: [ 1 ] },
        { name: 'b', arguments: [ { a: true, b: 'test' } ] },
        { name: 'c' }
      ]);
    });
  });
  describe('isPrivate()', () => {
    it('should return true if class member is private', () => {
      expect(isPrivate(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(isPrivate(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(isPrivate(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notPrivate()', () => {
    it('should return true if class member is not private', () => {
      expect(notPrivate(parseClass(`class T { private p; }`).members[ 0 ])).to.be.false;
      expect(notPrivate(parseClass(`class T { public p; }`).members[ 0 ])).to.be.true;
      expect(notPrivate(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('isPublic()', () => {
    it('should return true if class member is public', () => {
      expect(isPublic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.true;
      expect(isPublic(parseClass(`class T { protected p; }`).members[ 0 ])).to.be.false;
      expect(isPublic(parseClass(`class T { public readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notPublic()', () => {
    it('should return true if class member is not public', () => {
      expect(notPublic(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(notPublic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(notPublic(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isStatic()', () => {
    it('should return true if class member is static', () => {
      expect(isStatic(parseClass(`class T { static p; }`).members[ 0 ])).to.be.true;
      expect(isStatic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(isStatic(parseClass(`class T { private static readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notStatic()', () => {
    it('should return true if class member is not static', () => {
      expect(notStatic(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(notStatic(parseClass(`class T { static p; }`).members[ 0 ])).to.be.false;
      expect(notStatic(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isProperty()', () => {
    it('should return true if class member is property', () => {
      expect(isProperty(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(isProperty(parseClass(`class T { p() {}; }`).members[ 0 ])).to.be.false;
      expect(isProperty(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notProperty()', () => {
    it('should return true if class member is not property', () => {
      expect(notProperty(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(notProperty(parseClass(`class T { p(); }`).members[ 0 ])).to.be.true;
      expect(notProperty(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('isMethod()', () => {
    it('should return true if class member is method', () => {
      expect(isMethod(parseClass(`class T { p() {}; }`).members[ 0 ])).to.be.true;
      expect(isMethod(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(isMethod(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('notMethod()', () => {
    it('should return true if class member is not method', () => {
      expect(notMethod(parseClass(`class T { p() {}; }`).members[ 0 ])).to.be.false;
      expect(notMethod(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(notMethod(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isGetter()', () => {
    it('should return true if class member is getter', () => {
      expect(isGetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.true;
      expect(isGetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(isGetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('notGetter()', () => {
    it('should return true if class member is not getter', () => {
      expect(notGetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.false;
      expect(notGetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(notGetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isSetter()', () => {
    it('should return true if class member is setter', () => {
      expect(isSetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.false;
      expect(isSetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(isSetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notSetter()', () => {
    it('should return true if class member is not setter', () => {
      expect(notSetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.true;
      expect(notSetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(notSetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('isTransparent()', () => {
    it('should return true if node kind is of transparent type (any, void, never, null, undefined)', () => {
      expect(isTransparent(parse(`let x: any;`).type)).to.be.true;
      expect(isTransparent(parse(`let x: void;`).type)).to.be.true;
      expect(isTransparent(parse(`let x: never;`).type)).to.be.true;
      expect(isTransparent(parse(`let x: null;`).type)).to.be.true;
      expect(isTransparent(parse(`let x: undefined;`).type)).to.be.true;
      expect(isTransparent(parse(`let x: number;`).type)).to.be.false;
      expect(isTransparent(parse(`let x: string;`).type)).to.be.false;
      expect(isTransparent(parse(`let x: boolean;`).type)).to.be.false;
      expect(isTransparent(parse(`let x: object;`).type)).to.be.false;
    });
  });
  describe('notTransparent()', () => {
    it('should return true if node kind is not transparent type (any, void, never, null, undefined)', () => {
      expect(notTransparent(parse(`let x: any;`).type)).to.be.false;
      expect(notTransparent(parse(`let x: void;`).type)).to.be.false;
      expect(notTransparent(parse(`let x: never;`).type)).to.be.false;
      expect(notTransparent(parse(`let x: null;`).type)).to.be.false;
      expect(notTransparent(parse(`let x: undefined;`).type)).to.be.false;
      expect(notTransparent(parse(`let x: number;`).type)).to.be.true;
      expect(notTransparent(parse(`let x: string;`).type)).to.be.true;
      expect(notTransparent(parse(`let x: boolean;`).type)).to.be.true;
      expect(notTransparent(parse(`let x: object;`).type)).to.be.true;
    });
  });
  describe('wrapValue()', () => {
    it('should wrap a value in a function', () => {
      expect(wrapValue('10')()).to.equal(10);
      expect(wrapValue('"test" + "ing"')()).to.equal('testing');
      expect(wrapValue('[1, 2, 3]')()).to.deep.equal([ 1, 2, 3 ]);
      expect(wrapValue('[1, 2, 3]')()).to.not.equal(wrapValue('[1, 2, 3]')());
      expect(wrapValue('[1, 2, 3]')()).to.deep.equal(wrapValue('[1, 2, 3]')());
    });
  });
});
describe('parsers', () => {
  function parse(src) {
    const statement: VariableStatement = createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as any;
    return statement.declarationList.declarations[ 0 ] as any as PropertyDeclaration;
  }

  describe('parseUnionOrIntersectionType()', () => {
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
  describe('parseExpressionType()', () => {
    it('should understand simple numeral expressions', () => {
      expect(parseExpression(parse('let p = 5 + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 ** 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 * 5 * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 - 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 / 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 % 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 & 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 | 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 ^ 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = ~5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 << 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 >> 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = 5 >>> 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
    });
    it('should understand simple boolean expressions', () => {
      expect(parseExpression(parse('let p = 5 == 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 === 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 != 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 !== 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 < 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 <= 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 > 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parse('let p = 5 >= 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
    });
    it('should understand simple text expressions', () => {
      expect(parseExpression(parse('let p = "a" + "b";').initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
    });
    it('should understand mixed types simple expressions', () => {
      expect(parseExpression(parse('let p = "a" + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseExpression(parse('let p = true * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = window.innerWidth * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = window.innerWidth + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = (a || b) + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parse('let p = document.title + " string";').initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
    });
  });
  describe('parseDeclarationType()', () => {
    it('should direct unions and intersections to `parseUnionOrIntersectionType` function', () => {
      expect(parseDeclarationType(parse(`let p: 'test1' | 'test2';`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parse(`let p: string | null;`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parse(`let p: boolean | true;`))).to.equal(SyntaxKind.BooleanKeyword);
      expect(parseDeclarationType(parse(`let p: string | number;`))).to.equal(SyntaxKind.ObjectKeyword);
      expect(parseDeclarationType(parse(`let p: Date & Object;`))).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('parseDeclarationInitializer()', () => {
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
  describe('getFinalType()', () => {
    it('should return type of node or type of literal (if node is literal)', () => {
      expect(getFinalType(parse(`let x: string`).type).kind).to.equal(SyntaxKind.StringKeyword);
      expect(getFinalType(parse(`let x: 'test'`).type).kind).to.equal(SyntaxKind.StringLiteral);
      expect(getFinalType(parse(`let x: 10`).type).kind).to.equal(SyntaxKind.NumericLiteral);
    });
  });
  describe('getSimpleKind()', () => {
    it('should parse simple types', () => {
      expect(getSimpleKind(parse(`let p;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parse(`let p: string;`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(getSimpleKind(parse(`let p: number;`).type)).to.equal(SyntaxKind.NumberKeyword);
      expect(getSimpleKind(parse(`let p: boolean;`).type)).to.equal(SyntaxKind.BooleanKeyword);
      expect(getSimpleKind(parse(`let p: Array<boolean>;`).type)).to.equal(SyntaxKind.ArrayType);
    });
    it('should convert all TypeReferences to ObjectKeyword', () => {
      expect(getSimpleKind(parse(`let p: Date;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parse(`let p: Object;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parse(`let p: PolymerElement;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parse(`let p: ENUM;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
    it('should ignore all transparent types and convert them to Unknown type', () => {
      expect(getSimpleKind(parse(`let p: null;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parse(`let p: undefined;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parse(`let p: any;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parse(`let p: void;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parse(`let p: never;`).type)).to.equal(SyntaxKind.Unknown);
    });
    it('should parse literal types', () => {
      expect(getSimpleKind(parse(`let p: boolean[];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(getSimpleKind(parse(`let p: [ boolean ];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(getSimpleKind(parse(`let p: [ string, number ];`).type)).to.equal(SyntaxKind.ArrayType);

      expect(getSimpleKind(parse(`let p: 'test';`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(getSimpleKind(parse(`let p: { a: boolean, b: string };`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parse(`let p: () => string;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('getTypeAndValue()', () => {
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
// describe('builders', () => {
//   function parseClass(src) {
//     return createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as ClassDeclaration;
//   }
//
//   describe('buildPropertyObject()', () => {
//     it('should parse class correctly and build valid property objects', () => {
//       let parsed = parseClass(`class Test {
//       public readonly t1: string = document.title;
//       t2 = "test";
//       t3: string;
//       private helper: string;
//       /** Some test property */
//       test1: Date = Date.now();
//       test2: Date = new Date();
//       @attr @test('true') attr: string = null;
//       @compute("compute", ["test1", "test2"]) computed1: string;
//       @compute(function(t1: string, t2: string) { return t1 + t2; }, ["test1", 'test2']) computed2: string;
//     }`);
//       expect(getTypeAndValue(parsed.members[ 0 ] as PropertyDeclaration))
//         .to.include({ type: SyntaxKind.StringKeyword }).and.include.keys('value');
//
//       expect(hasModifier(parsed.members[ 0 ], SyntaxKind.ReadonlyKeyword)).to.be.true;
//       expect(hasModifier(parsed.members[ 2 ], SyntaxKind.PublicKeyword)).to.be.false;
//       expect(hasDecorator(parsed.members[ 6 ], 'attr')).to.be.true;
//       expect(hasDecorator(parsed.members[ 6 ], 'notify')).to.be.false;
//       expect(hasDecorator(parsed.members[ 7 ], 'compute')).to.be.true;
//       expect(hasDecorator(parsed.members[ 8 ], 'compute')).to.be.true;
//
//       let properties = parsed.members
//         .filter(isProperty)
//         .filter(notPrivate)
//         .filter(notStatic)
//         .map(buildPropertyObject);
//
//       expect(properties).to.have.length(8);
//       expect(properties.map((prop) => prop.config.toString())).to.deep.equal([
//         't1: { type: String, value: function () {\nreturn document.title;\n}, readOnly: true }',
//         't2: { type: String, value: "test" }',
//         't3: String',
//         '/** Some test property */\ntest1: { type: Date, value: function () {\nreturn Date.now();\n} }',
//         'test2: { type: Date, value: function () {\nreturn new Date();\n} }',
//         'attr: { type: String, reflectToAttribute: true }',
//         'computed1: { type: String, computed: "compute(test1, test2)" }',
//         'computed2: { type: String, computed: "_computed2Computed(test1, test2)" }'
//       ]);
//       expect(properties
//         .map((prop) => prop
//           .extras
//           .methods
//           .map((method) => method.toString())
//         )
//         .reduce((all, curr) => all.concat(curr), [])
//       ).to.deep.equal([
//         `_computed2Computed(t1,t2) {\nreturn t1 + t2;\n}`
//       ]);
//       parsed = parseClass(`
// @component("input-math")
// @template("<input>")
// export class InputMath extends Polymer.Element {
//   static HISTORY_SIZE: number = 20;
//
//   static SYMBOLS_BASIC: ICmd[] = [
//     { cmd: "\\sqrt", name: "√" },
//     { cmd: "\\nthroot", name: "√", className: "n-sup" },
//     { cmd: "\\int", name: "∫" },
//     { cmd: "^", name: "n", className: "sup" },
//     { cmd: "_", name: "n", className: "sub" },
//     { cmd: "\\rightarrow", name: "→" },
//     { cmd: "\\infty", name: "∞" },
//     { cmd: "\\neq", name: "≠" },
//     { cmd: "\\degree", name: "°" },
//     { cmd: "\\div", name: "÷" }
//   ];
//
//   static SYMBOLS_GREEK: ICmd[] = [
//     { cmd: "\\lambda", name: "λ" },
//     { cmd: "\\pi", name: "π" },
//     { cmd: "\\mu", name: "μ" },
//     { cmd: "\\sum", name: "Σ" },
//     { cmd: "\\alpha", name: "α" },
//     { cmd: "\\beta", name: "β" },
//     { cmd: "\\gamma", name: "γ" },
//     { cmd: "\\delta", name: "ᵟ", className: "big" },
//     { cmd: "\\Delta", name: "Δ" }
//   ];
//
//   static SYMBOLS_PHYSICS: ICmd[] = [
//     { cmd: "\\ohm", name: "Ω" },
//     { cmd: "\\phi", name: "ᶲ", className: "big" }
//   ];
//
//   testValue: "yep"|"nope";
//
//   @attr value: string|null = "";
//
//   @notify symbols: ICmd[][] = [
//     InputMath.SYMBOLS_BASIC,
//     InputMath.SYMBOLS_GREEK
//   ];
//
//   showSymbols: string = "";
//
//   private _history: string[];
//   private _mathField: MathQuill.EditableField;
//   private _observerLocked: boolean = false;
//   private _freezeHistory: boolean = false;
//   private _editor: HTMLElement = document.createElement("div");
//
//   constructor() {
//     super();
//     var editor: HTMLElement = this._editor;
//     editor.id = "editor";
//     editor.classList.add("input-math");
//     this[ "_mathField" ] = MathQuill.getInterface(2).MathField(editor, {
//       spaceBehavesLikeTab: true,
//       handlers: {
//         edit: this._updateValue.bind(this)
//       }
//     });
//   }
//
//   ready(): void {
//     this.insertBefore(this._editor, this.$.controls);
//   }
//
//   cmd(ev: PolymerEvent): void {
//     this._mathField.cmd(ev.model.item.cmd).focus();
//   }
//
//   undo(): void {
//     if (this._history && this._history.length > 0) {
//       this._freezeHistory = true;
//       this.value = this._history.pop();
//       this._freezeHistory = false;
//     }
//   }
//
//   @observe("value")
//   valueChanged(value: string, prevValue: string): Array<{ test: boolean }> {
//     this._updateHistory(prevValue);
//
//     if (this._observerLocked) {
//       return;
//     }
//
//     this._mathField.select().write(value);
//     if (this._mathField.latex() === "") {
//       this.undo();
//     }
//   }
//
//   @observe("showSymbols")
//   symbolsChanged(symbols: string): void {
//     if (symbols) {
//       this.symbols = symbols.split(",").map(groupName => {
//         return InputMath[ "SYMBOLS_" + groupName.toUpperCase() ] || [];
//       });
//     }
//   }
//
//   @listen("keydown")
//   keyShortcuts(ev: KeyboardEvent): void {
//     if (ev.ctrlKey && ev.keyCode === 90) {
//       this.undo();
//     }
//   }
//
//   _updateValue(test: { a: () => void, b: any }): void {
//     console.log(test);
//     this._observerLocked = true;
//     this.value = this._mathField.latex();
//     this._observerLocked = false;
//   }
//
//   private _updateHistory(prevValue: string): void {
//     if (!this._history) {
//       this._history = [];
//     }
//
//     if (this._freezeHistory || prevValue == null) {
//       return;
//     }
//
//     this._history.push(prevValue);
//     if (this._history.length > InputMath.HISTORY_SIZE) {
//       this._history.shift();
//     }
//   }
// }`);
//
//       properties = parsed.members
//         .filter(isProperty)
//         .filter(notPrivate)
//         .filter(notStatic)
//         .map(buildPropertyObject);
//
//       expect(properties).to.have.length(4);
//     });
//   });
// });
