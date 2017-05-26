/* tslint:disable:no-unused-expression */
import { expect } from 'chai';
import {
  BinaryExpression, Block, CallExpression, ClassDeclaration, createSourceFile, ExpressionStatement, Identifier, MethodDeclaration,
  PrefixUnaryExpression, PropertyDeclaration, ScriptTarget, SyntaxKind, UnionOrIntersectionTypeNode, VariableStatement
} from 'typescript';
import { Component, decoratorsMap, Method, Property } from '../builder';
import {
  flatExtends, flattenArray, getDecorators, getText, hasDecorator, hasModifier, inheritsFrom, isBinaryExpression, isBlock, isCallExpression,
  isExtendsDeclaration, isGetter, isIdentifier, isMethod, isPrefixUnaryExpression, isPrivate, isProperty, isPublic, isSetter, isStatic,
  isTransparent, Link, notGetter, notMethod, notPrivate, notProperty, notPublic, notSetter, notStatic, notTransparent, Ref,
  ReferencedExpression, toProperty,
  toString,
  wrapValue
} from '../helpers';
// import { hasDecorator, hasModifier, isProperty, notPrivate, notStatic } from '../helpers';
import {
  getFinalType, getSimpleKind, getTypeAndValue, parseDeclarationInitializer, parseDeclarationType, parseExpression,
  parseUnionOrIntersectionType
} from '../parsers';

function parse(src) {
  const statement = createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as ExpressionStatement;
  return statement.expression as any;
}
function parseDeclaration(src) {
  const statement: VariableStatement = createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as any;
  return statement.declarationList.declarations[ 0 ] as any as PropertyDeclaration;
}
function parseClass(src) {
  return createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as ClassDeclaration;
}

describe('helpers', () => {
  describe('getDecorators()', () => {
    it('should return a list of parsed decorators (name and arguments object)', () => {
      expect(getDecorators(parseClass(`class T { @a(1) @b({a: true, b: 'test'}) @c p; }`).members[ 0 ])).to.deep.equal([
        { name: 'a', arguments: [ 1 ] },
        { name: 'b', arguments: [ { a: true, b: 'test' } ] },
        { name: 'c' }
      ]);
    });
    it('should create a method declaration named `_*propertyName*Computed` for function passed as arguments', () => {
      const method = getDecorators(parseClass(`class T { @a((a: string, b: number) => a.repeat(b)) p; }`).members[ 0 ])[ 0 ].arguments[ 0 ];
      expect(method).to.be.instanceof(Method);
      expect(method.name).to.equal('_pComputed');
      expect(method.toString()).to.equal('_pComputed(a: string, b: number) { return a.repeat(b); }');
    });
    it('should handle passing object references as a decorator argument', () => {
      const ref = getDecorators(parseClass(`class T { @a(someRef) p; }`).members[ 0 ])[ 0 ].arguments[ 0 ];
      expect(ref).to.be.instanceof(Ref);
      expect(ref.ref.getText()).to.equal('someRef');
      expect(ref.toString()).to.equal('someRef');
    });
    it('should handle expressions with references as a decorator argument', () => {
      const expr = getDecorators(parseClass(`class T { @a({ name: nameRef, value: valueRef }) p; }`).members[ 0 ])[ 0 ].arguments[ 0 ];
      expect(expr).to.be.instanceof(ReferencedExpression);
      expect(expr.toString()).to.equal('{ name: nameRef, value: valueRef }');
    });
  });
  describe('flatExtends', () => {
    it('should flatten chained extend mixins', () => {
      expect(flatExtends(parseClass(`class X extends A {}`).heritageClauses[ 0 ].types[ 0 ].expression)).to.deep.equal([ 'A' ]);
      expect(flatExtends(parseClass(`class X extends A(B(C(D(E(F))))) {}`).heritageClauses[ 0 ].types[ 0 ].expression)).to.deep.equal([
        'A', 'B', 'C', 'D', 'E', 'F'
      ]);
    });
  });
  describe('inheritsFrom', () => {
    it('should return if class extends specified class', () => {
      expect(inheritsFrom(parseClass(`class X extends HTMLElement {}`), 'HTMLElement')).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends Polymer.Element {}`), 'Polymer.Element')).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends Y {}`), 'Z')).to.be.false;
    });
    it('should return if class extends specified mixin', () => {
      expect(inheritsFrom(parseClass(`class X extends A(B(C(D(E(Polymer.Element))))) {}`), 'Polymer.Element')).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends A(B(C(Polymer.Element(E(F))))) {}`), 'Polymer.Element')).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends A(B(C(D(E(F))))) {}`), 'X')).to.be.false;
    });
    it('should return if interface extends specified interface', () => {
      expect(inheritsFrom(parseClass(`interface X extends A {}`), 'A')).to.be.true;
      expect(inheritsFrom(parseClass(`interface X extends A {}`), 'X')).to.be.false;
      expect(inheritsFrom(parseClass(`interface X extends A, B, C, D, E {}`), 'B')).to.be.true;
      expect(inheritsFrom(parseClass(`interface X extends A, B, C, D, E {}`), 'Z')).to.be.false;
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
  describe('isBinaryExpression()', () => {
    it('should check if expression is a binary expression', () => {
      const expr = parseDeclaration('let p = 5 * 5;').initializer;
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
      const expr = parseDeclaration('let p = ~5;').initializer;
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
      const expr = parseDeclaration('let p = test();').initializer;
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
      const expr = parseDeclaration('let p = undefined;').initializer;
      if (isIdentifier(expr)) {
        const identifier: Identifier = expr;
        expect(identifier).to.not.be.null;
        expect(identifier).to.contain.keys('originalKeywordKind');
      } else {
        expect(expr).to.equal('Identifier');
      }
    });
  });
  describe('isBlock()', () => {
    it('should check if expression is a block', () => {
      const method = parseClass(`class X { m() { return false; };`).members[ 0 ] as MethodDeclaration;
      if (isBlock(method.body)) {
        const body: Block = method.body;
        expect(body).to.not.be.null;
        expect(body).to.contain.keys('statements');
      } else {
        expect(method.body).to.equal('Block');
      }
    });
  });
  describe('isExtendsDeclaration()', () => {
    it('should check if heritage clause is extend declaration', () => {
      expect(isExtendsDeclaration(parseClass(`class X extends Y {}`).heritageClauses[ 0 ])).to.be.true;
    });
  });
  describe('isPrivate()', () => {
    it('should return true if class member is private', () => {
      expect(isPrivate(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(isPrivate(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(isPrivate(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isPublic()', () => {
    it('should return true if class member is public', () => {
      expect(isPublic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.true;
      expect(isPublic(parseClass(`class T { protected p; }`).members[ 0 ])).to.be.false;
      expect(isPublic(parseClass(`class T { public readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isStatic()', () => {
    it('should return true if class member is static', () => {
      expect(isStatic(parseClass(`class T { static p; }`).members[ 0 ])).to.be.true;
      expect(isStatic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(isStatic(parseClass(`class T { private static readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isProperty()', () => {
    it('should return true if class member is property', () => {
      expect(isProperty(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(isProperty(parseClass(`class T { p() {}; }`).members[ 0 ])).to.be.false;
      expect(isProperty(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isMethod()', () => {
    it('should return true if class member is method', () => {
      expect(isMethod(parseClass(`class T { p() {}; }`).members[ 0 ])).to.be.true;
      expect(isMethod(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(isMethod(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('isGetter()', () => {
    it('should return true if class member is getter', () => {
      expect(isGetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.true;
      expect(isGetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(isGetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('isSetter()', () => {
    it('should return true if class member is setter', () => {
      expect(isSetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.false;
      expect(isSetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(isSetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('isTransparent()', () => {
    it('should return true if node kind is of transparent type (any, void, never, null, undefined)', () => {
      expect(isTransparent(parseDeclaration(`let x: any;`).type)).to.be.true;
      expect(isTransparent(parseDeclaration(`let x: void;`).type)).to.be.true;
      expect(isTransparent(parseDeclaration(`let x: never;`).type)).to.be.true;
      expect(isTransparent(parseDeclaration(`let x: null;`).type)).to.be.true;
      expect(isTransparent(parseDeclaration(`let x: undefined;`).type)).to.be.true;
      expect(isTransparent(parseDeclaration(`let x: number;`).type)).to.be.false;
      expect(isTransparent(parseDeclaration(`let x: string;`).type)).to.be.false;
      expect(isTransparent(parseDeclaration(`let x: boolean;`).type)).to.be.false;
      expect(isTransparent(parseDeclaration(`let x: object;`).type)).to.be.false;
    });
  });
  describe('notPrivate()', () => {
    it('should return true if class member is not private', () => {
      expect(notPrivate(parseClass(`class T { private p; }`).members[ 0 ])).to.be.false;
      expect(notPrivate(parseClass(`class T { public p; }`).members[ 0 ])).to.be.true;
      expect(notPrivate(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('notPublic()', () => {
    it('should return true if class member is not public', () => {
      expect(notPublic(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(notPublic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(notPublic(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notStatic()', () => {
    it('should return true if class member is not static', () => {
      expect(notStatic(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(notStatic(parseClass(`class T { static p; }`).members[ 0 ])).to.be.false;
      expect(notStatic(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notProperty()', () => {
    it('should return true if class member is not property', () => {
      expect(notProperty(parseClass(`class T { p; }`).members[ 0 ])).to.be.false;
      expect(notProperty(parseClass(`class T { p(); }`).members[ 0 ])).to.be.true;
      expect(notProperty(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('notMethod()', () => {
    it('should return true if class member is not method', () => {
      expect(notMethod(parseClass(`class T { p() {}; }`).members[ 0 ])).to.be.false;
      expect(notMethod(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(notMethod(parseClass(`class T { p = () => true; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notGetter()', () => {
    it('should return true if class member is not getter', () => {
      expect(notGetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.false;
      expect(notGetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(notGetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.true;
    });
  });
  describe('notSetter()', () => {
    it('should return true if class member is not setter', () => {
      expect(notSetter(parseClass(`class T { get p() {}; }`).members[ 0 ])).to.be.true;
      expect(notSetter(parseClass(`class T { p; }`).members[ 0 ])).to.be.true;
      expect(notSetter(parseClass(`class T { set p(v) {}; }`).members[ 0 ])).to.be.false;
    });
  });
  describe('notTransparent()', () => {
    it('should return true if node kind is not transparent type (any, void, never, null, undefined)', () => {
      expect(notTransparent(parseDeclaration(`let x: any;`).type)).to.be.false;
      expect(notTransparent(parseDeclaration(`let x: void;`).type)).to.be.false;
      expect(notTransparent(parseDeclaration(`let x: never;`).type)).to.be.false;
      expect(notTransparent(parseDeclaration(`let x: null;`).type)).to.be.false;
      expect(notTransparent(parseDeclaration(`let x: undefined;`).type)).to.be.false;
      expect(notTransparent(parseDeclaration(`let x: number;`).type)).to.be.true;
      expect(notTransparent(parseDeclaration(`let x: string;`).type)).to.be.true;
      expect(notTransparent(parseDeclaration(`let x: boolean;`).type)).to.be.true;
      expect(notTransparent(parseDeclaration(`let x: object;`).type)).to.be.true;
    });
  });
  describe('toString()', () => {
    it('should run toString method on all items in an array', () => {
      expect([ 'a', 2, [ 1, 2 ], true, {} ].map(toString)).to.deep.equal([ 'a', '2', '1,2', 'true', '[object Object]' ]);
    });
  });
  describe('getText()', () => {
    it('should run getText method on all items in an array', () => {
      expect(parseClass(`class X { a: string; b: number; c: boolean; }`).members.map(getText)).to.deep.equal([
        'a: string;', 'b: number;', 'c: boolean;'
      ]);
    });
  });
  describe('flattenArray()', () => {
    it('should flatten an array', () => {
      expect([ 1, 2, [ 3, 4 ] ].reduce(flattenArray, [])).to.deep.equal([ 1, 2, 3, 4 ]);
    });
  });
  describe('toProperty()', () => {
    it('should map an array of objects to an array of the specific properties', () => {
      expect([ { a: 1 }, { a: 2, b: 3 }, { a: 3, c: 5 } ].map(toProperty('a'))).to.deep.equal([ 1, 2, 3 ]);
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
  describe('parseUnionOrIntersectionType()', () => {
    it('should parseDeclaration unions with same types', () => {
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: string | string;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: number | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: boolean | boolean;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: Array<any> | Array<any>;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ArrayType);
    });
    it('should ignore transparent types when parsing unions', () => {
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: string | null;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: null | string;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: string | any;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
    });
    it('should return ObjectKeyword for mixed types', () => {
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: string | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
    });
    it('should parseDeclaration literals unions', () => {
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: 'a' | 'b';`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: 1 | 2;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parseDeclaration(`let p: 'a' | 1;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('parseExpression()', () => {
    it('should understand simple numeral expressions', () => {
      expect(parseExpression(parseDeclaration('let p = 5 + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 ** 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 * 5 * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 - 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 / 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 % 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 & 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 | 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 ^ 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = ~5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 << 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 >> 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 >>> 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
    });
    it('should understand simple boolean expressions', () => {
      expect(parseExpression(parseDeclaration('let p = 5 == 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 === 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 != 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 !== 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 < 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 <= 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 > 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parseDeclaration('let p = 5 >= 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
    });
    it('should understand simple text expressions', () => {
      expect(parseExpression(parseDeclaration('let p = "a" + "b";').initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
    });
    it('should understand mixed types simple expressions', () => {
      expect(parseExpression(parseDeclaration('let p = "a" + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseExpression(parseDeclaration('let p = true * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = window.innerWidth * 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = window.innerWidth + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = (a || b) + 5;').initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parseDeclaration('let p = document.title + " string";').initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
    });
  });
  describe('parseDeclarationType()', () => {
    it('should direct unions and intersections to `parseUnionOrIntersectionType` function', () => {
      expect(parseDeclarationType(parseDeclaration(`let p: 'test1' | 'test2';`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parseDeclaration(`let p: string | null;`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parseDeclaration(`let p: boolean | true;`))).to.equal(SyntaxKind.BooleanKeyword);
      expect(parseDeclarationType(parseDeclaration(`let p: string | number;`))).to.equal(SyntaxKind.ObjectKeyword);
      expect(parseDeclarationType(parseDeclaration(`let p: Date & Object;`))).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('parseDeclarationInitializer()', () => {
    it('should return no value and type Unknown if there is no initializer', () => {
      expect(parseDeclarationInitializer(parseDeclaration('let p;'))).to.deep.equal({
        type: SyntaxKind.Unknown
      });
      expect(parseDeclarationInitializer(parseDeclaration('let p: string;'))).to.deep.equal({
        type: SyntaxKind.Unknown
      });
    });
    it('should get type and value from simple literal initializer', () => {
      expect(parseDeclarationInitializer(parseDeclaration('let p = "test";'))).to.deep.equal({
        type: SyntaxKind.StringKeyword, value: '"test"'
      });
      expect(parseDeclarationInitializer(parseDeclaration('let p = true;'))).to.deep.equal({
        type: SyntaxKind.BooleanKeyword, value: true
      });
      expect(parseDeclarationInitializer(parseDeclaration('let p = 10;'))).to.deep.equal({
        type: SyntaxKind.NumberKeyword, value: 10
      });
      expect(parseDeclarationInitializer(parseDeclaration('let p = `25`;'))).to.deep.equal({
        type: SyntaxKind.StringKeyword, value: '`25`'
      });
    });
    it('should get type and value from complex initializer and wrap value with an anonymous function', () => {
      let initAndType = parseDeclarationInitializer(parseDeclaration('let p = `${25}`;'));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return `${25}`; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = { a: true };'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return { a: true }; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = ENUM.A;'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return ENUM.A; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = () => "test";'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return () => "test"; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = new Date();'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return new Date(); }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = [ 1, 2, 3 ];'));
      expect(initAndType.type).to.equal(SyntaxKind.ArrayType);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return [ 1, 2, 3 ]; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = new Array(10);'));
      expect(initAndType.type).to.equal(SyntaxKind.ArrayType);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return new Array(10); }');
    });
    it('should get type and value from expressions', () => {
      let initAndType = parseDeclarationInitializer(parseDeclaration('let p = 5 * 5 * 5;'));
      expect(initAndType.type).to.equal(SyntaxKind.NumberKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return 5 * 5 * 5; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = "test" + "test";'));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return "test" + "test"; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = 5 * innerWidth;'));
      expect(initAndType.type).to.equal(SyntaxKind.NumberKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return 5 * innerWidth; }');
    });
    it('should fallback to ObjectKeyword if no type was recognized', () => {
      let initAndType = parseDeclarationInitializer(parseDeclaration('let p = window && window.opener;'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' '))
        .to.equal('function () { return window && window.opener; }');

      initAndType = parseDeclarationInitializer(parseDeclaration('let p = (window && window.opener);'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' '))
        .to.equal('function () { return (window && window.opener); }');
    });
  });
  describe('getFinalType()', () => {
    it('should return type of node or type of literal (if node is literal)', () => {
      expect(getFinalType(parseDeclaration(`let x: string`).type).kind).to.equal(SyntaxKind.StringKeyword);
      expect(getFinalType(parseDeclaration(`let x: 'test'`).type).kind).to.equal(SyntaxKind.StringLiteral);
      expect(getFinalType(parseDeclaration(`let x: 10`).type).kind).to.equal(SyntaxKind.NumericLiteral);
    });
  });
  describe('getSimpleKind()', () => {
    it('should parseDeclaration simple types', () => {
      expect(getSimpleKind(parseDeclaration(`let p;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parseDeclaration(`let p: string;`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: number;`).type)).to.equal(SyntaxKind.NumberKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: boolean;`).type)).to.equal(SyntaxKind.BooleanKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: Array<boolean>;`).type)).to.equal(SyntaxKind.ArrayType);
    });
    it('should convert all TypeReferences to ObjectKeyword', () => {
      expect(getSimpleKind(parseDeclaration(`let p: Date;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: Object;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: PolymerElement;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: ENUM;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
    it('should ignore all transparent types and convert them to Unknown type', () => {
      expect(getSimpleKind(parseDeclaration(`let p: null;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parseDeclaration(`let p: undefined;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parseDeclaration(`let p: any;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parseDeclaration(`let p: void;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parseDeclaration(`let p: never;`).type)).to.equal(SyntaxKind.Unknown);
    });
    it('should parseDeclaration literal types', () => {
      expect(getSimpleKind(parseDeclaration(`let p: boolean[];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(getSimpleKind(parseDeclaration(`let p: [ boolean ];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(getSimpleKind(parseDeclaration(`let p: [ string, number ];`).type)).to.equal(SyntaxKind.ArrayType);

      expect(getSimpleKind(parseDeclaration(`let p: 'test';`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: { a: boolean, b: string };`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parseDeclaration(`let p: () => string;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe('getTypeAndValue()', () => {
    it('should prefer implicit type over deducted one', () => {
      expect(getTypeAndValue(parseDeclaration('let p: number = null;')))
        .to.deep.equal({ type: SyntaxKind.NumberKeyword, value: null, isDate: false });
      expect(getTypeAndValue(parseDeclaration('let p: number = undefined;')))
        .to.deep.equal({ type: SyntaxKind.NumberKeyword, value: undefined, isDate: false });

      const initAndType = getTypeAndValue(parseDeclaration('let p: string = document.title;'));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' ')).to.equal('function () { return document.title; }');
    });
  });
});
describe('builders', () => {
  describe('Method()', () => {
    const method = parseDeclaration(`let x = function(a, b) { return a + b; }`).initializer as any as MethodDeclaration;
    it('should parseDeclaration a function expression and return a function', () => {
      expect(new Method(method).toString()).to.equal(`function(a, b) { return a + b; }`);
    });
    it('should name a function if name was provided', () => {
      expect(new Method(method, 'testFun').toString()).to.equal(`testFun(a, b) { return a + b; }`);
      expect(new Method(method, 'testFun').name).to.equal('testFun');
    });
  });
  describe('Property()', () => {
    it('should parseDeclaration properties', () => {
      const classDeclaration = parseClass(`class Test {
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

      expect(classDeclaration
        .members
        .filter(isProperty)
        .filter(notPrivate)
        .filter(notStatic)
        .map((property: PropertyDeclaration) => new Property(property, property.name.getText()))
        .map((property) => property.toString())
      ).to.deep.equal([
        't1: { type: String, value: function () {\nreturn document.title;\n}, readOnly: true }',
        't2: { type: String, value: "test" }',
        't3: String',
        '/** Some test property */\ntest1: { type: Date, value: function () {\nreturn Date.now();\n} }',
        'test2: { type: Date, value: function () {\nreturn new Date();\n} }',
        'attr: { type: String }',
        'computed1: String',
        'computed2: String'
      ]);
    });
  });
  describe('Component()', () => {
    it('should save the class name', () => {
      expect(new Component(parseClass(`class Test {}`)).name).to.equal('Test');
    });
    it('should save super class', () => {
      expect(new Component(parseClass(`class Test extends X(Y(Z)) implements A, B {}`)).heritage).to.equal('X(Y(Z))');
    });
    it('should use template method to get the template', () => {
      expect(new Component(parseClass(`class Test {
        name: string;
        lastName: string;

        template() {
          return \`<h1>\${this.lastName}</h1> <h2>\${this.name}</h2>\`;
        }
      }`)).template).to.equal('<h1>{{lastName}}</h1> <h2>{{name}}</h2>');
    });
    it('should parseDeclaration class correctly and build valid properties and methods', () => {
      let element = new Component(parseClass(`class Test {
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

      testFun() { return 10; }
    }`));

      expect(element[ 'properties' ].size).to.equal(8);
      expect(element[ 'methods' ].size).to.equal(2);

      expect(Array.from(element[ 'properties' ].values()).map(toString)).to.deep.equal([
        't1: { type: String, value: function () {\nreturn document.title;\n}, readOnly: true }',
        't2: { type: String, value: "test" }',
        't3: String',
        '/** Some test property */\ntest1: { type: Date, value: function () {\nreturn Date.now();\n} }',
        'test2: { type: Date, value: function () {\nreturn new Date();\n} }',
        'attr: { type: String, reflectToAttribute: true }',
        'computed1: { type: String, computed: "compute(test1, test2)" }',
        'computed2: { type: String, computed: "_computed2Computed(test1, test2)" }'
      ]);
      expect(Array.from(element[ 'methods' ].values()).map(toString)).to.deep.equal([
        `_computed2Computed(t1: string, t2: string) { return t1 + t2; }`,
        `testFun() { return 10; }`
      ]);
      element = new Component(parseClass(`
      @component("input-math")
      @template("&lt;input&gt;")
      export class InputMath extends Polymer.Element {
        static HISTORY_SIZE: number = 20;

        static SYMBOLS_BASIC: ICmd[] = [
          { cmd: "\\sqrt", name: "√" },
          { cmd: "\\div", name: "÷" }
        ];

        static SYMBOLS_GREEK: ICmd[] = [
          { cmd: "\\gamma", name: "γ" },
          { cmd: "\\Delta", name: "Δ" }
        ];

        static SYMBOLS_PHYSICS: ICmd[] = [
          { cmd: "\\ohm", name: "Ω" },
          { cmd: "\\phi", name: "ᶲ", className: "big" }
        ];

        static testMe() {
          return true;
        }

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

        @observe("testValue", "symbols")
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
      }`));

      expect(element[ 'properties' ].size).to.equal(4);
      expect(element[ 'methods' ].size).to.equal(9);

      expect(Array.from(element[ 'properties' ].values()).map(toString)).to.deep.equal([
        'testValue: String',
        'value: { type: String, value: "", reflectToAttribute: true, observer: "valueChanged" }',
        'symbols: { type: Array, value: function () {\nreturn [\n          InputMath.SYMBOLS_BASIC,\n          ' +
        'InputMath.SYMBOLS_GREEK\n        ];\n}, notify: true }',
        'showSymbols: { type: String, value: "", observer: "symbolsChanged" }'
      ]);

      //noinspection TsLint
      expect(Array.from(element[ 'methods' ].values()).map(toString)).to.deep.equal([
        'constructor() { super();\nvar editor: HTMLElement = this._editor;\neditor.id = "editor";\neditor.classList.add("input-math");\nthis[ "_mathField" ] = MathQuill.getInterface(2).MathField(editor, {\n            spaceBehavesLikeTab: true,\n            handlers: {\n              edit: this._updateValue.bind(this)\n            }\n          }); }',
        'ready() { this.insertBefore(this._editor, this.$.controls); }',
        'cmd(ev: PolymerEvent) { this._mathField.cmd(ev.model.item.cmd).focus(); }',
        'undo() { if (this._history && this._history.length > 0) {\n            this._freezeHistory = true;\n            this.value = this._history.pop();\n            this._freezeHistory = false;\n          } }',
        'valueChanged(value: string, prevValue: string) { this._updateHistory(prevValue);\nif (this._observerLocked) {\n            return;\n          }\nthis._mathField.select().write(value);\nif (this._mathField.latex() === "") {\n            this.undo();\n          } }',
        'symbolsChanged(symbols: string) { if (symbols) {\n            this.symbols = symbols.split(",").map(groupName => {\n              return InputMath[ "SYMBOLS_" + groupName.toUpperCase() ] || [];\n            });\n          } }',
        'keyShortcuts(ev: KeyboardEvent) { if (ev.ctrlKey && ev.keyCode === 90) {\n            this.undo();\n          } }',
        '_updateValue(test: { a: () => void, b: any }) { console.log(test);\nthis._observerLocked = true;\nthis.value = this._mathField.latex();\nthis._observerLocked = false; }',
        '_updateHistory(prevValue: string) { if (!this._history) {\n            this._history = [];\n          }\nif (this._freezeHistory || prevValue == null) {\n            return;\n          }\nthis._history.push(prevValue);\nif (this._history.length > InputMath.HISTORY_SIZE) {\n            this._history.shift();\n          } }'
      ]);

      //noinspection TsLint
      const stat = Array.from(element[ 'staticProperties' ].values()).map(({ name, value }) => ({ name, value }));
      expect(stat.map(({ name }) => name)).to.deep.equal([
        'HISTORY_SIZE', 'SYMBOLS_BASIC', 'SYMBOLS_GREEK', 'SYMBOLS_PHYSICS'
      ]);
      expect(stat.map(({ value }) => typeof value === 'function' ? value() : value)).to.deep.equal([
        20,
        [ { cmd: 'sqrt', name: '√' }, { cmd: 'div', name: '÷' } ],
        [ { cmd: 'gamma', name: 'γ' }, { cmd: 'Delta', name: 'Δ' } ],
        [ { cmd: 'ohm', name: 'Ω' }, { cmd: 'phi', name: 'ᶲ', className: 'big' } ]
      ]);

      expect(Array.from(element[ 'staticMethods' ].values()).map(({ name, statements }) => ({ name, statements })))
        .to.deep.equal([ { name: 'testMe', statements: [ 'return true;' ] } ]);

      expect(element[ 'observers' ]).to.deep.equal([
        '_updateValue(testValue, symbols)'
      ]);
    });
  });
});
describe('decorators', () => {
  describe('@attr', () => {
    it('should set `reflectToAttribute` flag on provided property to true', () => {
      const prop = {} as Property;
      decoratorsMap.attr(prop);
      expect(prop.reflectToAttribute).to.be.true;
    });
  });
  describe('@notify', () => {
    it('should set `notify` flag on provided property to true', () => {
      const prop = {} as Property;
      decoratorsMap.notify(prop);
      expect(prop.notify).to.be.true;
    });
  });
  describe('@compute()', () => {
    it('should set `computed` to be a provided method name with provided arguments (if provided a string)', () => {
      const prop = {} as Property;
      decoratorsMap.compute(prop, 'computed', [ 'a', 'b' ]);
      expect(prop.computed).to.equal('"computed(a, b)"');
    });
    it('should set a `computed` to be a name of provided function and arguments (if provided a function)', () => {
      const prop = {} as Property;
      decoratorsMap.compute(prop, new Method(parse('(a, b) => a + b)') as any, 'computed'), [ 'a', 'b' ]);
      expect(prop.computed).to.equal('"computed(a, b)"');
    });
    it('should return an array containing method declaration if provided a function as ', () => {
      const prop = {} as Property;
      const [ method ] = decoratorsMap.compute(prop, new Method(parse('(a, b) => a + b)') as any, 'computed'), [ 'a', 'b' ]).methods;
      expect(method).to.be.instanceof(Method);
      expect(method.name).to.equal('computed');
      expect(method.toString()).to.equal('computed(a, b) { return a + b; }');
    });
  });
  describe('@observe()', () => {
    it('should return an array containing object with `name` of property and method name as `observer` if observing single prop', () => {
      const { properties: [ property ] } = decoratorsMap.observe({ name: 'observerMethod' } as Method, 'prop');
      expect(property).to.deep.equal({ name: 'prop', observer: '"observerMethod"' });
    });
    it('should return an array containing method name and all properties as arguments if observing multiple properties', () => {
      const { observers: [ observer ] } = decoratorsMap.observe({ name: 'observerMethod' } as Method, 'prop1', 'prop2');
      expect(observer).to.equal('observerMethod(prop1, prop2)');
    });
    it('should use arguments names if no properties were provided', () => {
      const functionDeclaration = parseDeclaration('let x = function(prop1: string, prop2: string) { return prop1 + prop2; }').initializer;
      const method = new Method(functionDeclaration as any, 'observerMethod');
      const { observers: [ observer ] } = decoratorsMap.observe(method);
      expect(observer).to.equal('observerMethod(prop1, prop2)');
    });
    it('should add observer to observers array if path is provided instead of property name', () => {
      const { observers: [ observer ] } = decoratorsMap.observe({ name: 'observerMethod' } as Method, 'prop.deep');
      expect(observer).to.equal('observerMethod(prop.deep)');
    });
  });
  describe('@style()', () => {
    it('should set styles to an array of size equal to number of provided declarations', () => {
      const component = {} as Component;
      decoratorsMap.style(component, 'my-styles1', 'my-styles2', 'my-styles3');
      expect(component.styles).to.have.lengthOf(3);
    });
    it('should set styles to an array containing a Link object with provided uri if css file path is provided', () => {
      const component = {} as Component;
      decoratorsMap.style(component, 'file.css');
      const [ style ] = component.styles as [ Link ];
      expect(style).to.be.instanceof(Link);
      expect(style.uri).to.equal('file.css');
    });
    it('should set styles to an array containing object with provided style and type `inline` if css was provided', () => {
      const component = {} as Component;
      decoratorsMap.style(component, ':host { color: red; }');
      const [ { style, type } ] = component.styles as [ { type: 'inline', style: string; } ];
      expect(style).to.equal(':host { color: red; }');
      expect(type).to.equal('inline');
    });
    it('should set styles to an array containing object with component name and type `shared` if shared style was provided', () => {
      const component = {} as Component;
      decoratorsMap.style(component, 'my-styles');
      const [ { style, type } ] = component.styles as [ { type: 'shared', style: string; } ];
      expect(style).to.equal('my-styles');
      expect(type).to.equal('shared');
    });
    it('should set styles to an array of mixed style declarations types', () => {
      const component = {} as Component;
      decoratorsMap.style(component, 'file.css', 'my-styles', ':host { color: red; }');
      expect(component.styles).to.deep.equal([
        { uri: 'file.css' },
        { type: 'shared', style: 'my-styles' },
        { type: 'inline', style: ':host { color: red; }' }
      ]);
    });
  });
  describe('@template()', () => {
    it('should set template to be a Link if provided html file path', () => {
      const component = {} as Component;
      decoratorsMap.template(component, 'template.html');
      const template = component.template as Link;
      expect(template).to.be.instanceof(Link);
      expect(template.uri).to.equal('template.html');
    });

    it('should set template to be as provided', () => {
      const component = {} as Component;
      decoratorsMap.template(component, '<h1>Hello World</h1>');
      expect(component.template).to.equal('<h1>Hello World</h1>');
    });
  });
});
