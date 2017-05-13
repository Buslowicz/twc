import { expect } from 'chai';
import {
  BinaryExpression, createSourceFile, ScriptTarget, SyntaxKind, UnionOrIntersectionTypeNode, VariableStatement
} from 'typescript';
import {
  parseDeclarationInitializer, parseDeclarationType, parseExpression, parseUnionOrIntersectionType, typeToSimpleKind
} from '../parsers';

describe('parsers', () => {
  function parse(src) {
    const statement: VariableStatement = createSourceFile('', src, ScriptTarget.ES2015, true).statements[ 0 ] as any;
    return statement.declarationList.declarations[ 0 ];
  }

  //   public p13: number = 5 * window.innerWidth;
  //   public p06: string = null;

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
        .to
        .equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: number | number;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: boolean | boolean;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.BooleanKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: Array<any> | Array<any>;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.ArrayType);
    });
    it('should ignore transparent types when parsing unions', () => {
      expect(parseUnionOrIntersectionType(parse(`let p: string | null;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: null | string;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: string | any;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.StringKeyword);
    });
    it('should return ObjectKeyword for mixed types', () => {
      expect(parseUnionOrIntersectionType(parse(`let p: string | number;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.ObjectKeyword);
    });
    it('should parse literals unions', () => {
      expect(parseUnionOrIntersectionType(parse(`let p: 'a' | 'b';`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: 1 | 2;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parse(`let p: 'a' | 1;`).type as UnionOrIntersectionTypeNode))
        .to
        .equal(SyntaxKind.ObjectKeyword);
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
      expect(parseDeclarationInitializer(parse('let p;'))).to.deep.equal({ type: SyntaxKind.Unknown });
      expect(parseDeclarationInitializer(parse('let p: string;'))).to.deep.equal({ type: SyntaxKind.Unknown });
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
        .to
        .equal('function () { return window && window.opener; }');

      initAndType = parseDeclarationInitializer(parse('let p = (window && window.opener);'));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, ' '))
        .to
        .equal('function () { return (window && window.opener); }');
    });
  });
});
