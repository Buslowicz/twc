import { expect } from 'chai';
import { createSourceFile, ScriptTarget, SyntaxKind, UnionOrIntersectionTypeNode, VariableStatement } from 'typescript';
import { parseDeclarationType, parseUnionOrIntersectionType, typeToSimpleKind } from '../parsers';

describe('parsers', () => {
  function parse(src) {
    const statement: VariableStatement = createSourceFile('', src, ScriptTarget.ES2015, false).statements[ 0 ] as any;
    return statement.declarationList.declarations[ 0 ];
  }

  //   public p27: [ string, number ] = [ 'a', 10 ];
  //   public p13: number = 5 * window.innerWidth;
  //   public p06: string = null;

  //   public p03 = 'test';
  //   public p04 = 'test' + 'test';
  //   public p05 = \`${25}\`;
  //   public p10 = 10;
  //   public p11 = 5 * 5 * 5;
  //   public p12 = 5 * window.innerWidth;
  //   public p15 = true;
  //   public p16 = (window && window.opener);
  //   public p18 = new Date();
  //   public p20 = { a: true, b: 'test' };
  //   public p24 = [ 1, 2, 3 ];
  //   public p25 = new Array(10);
  //   public p36 = ENUM.A;
  //   public p41 = () => 'test';

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
  describe('::parseDeclarationType()', () => {
    it('should direct unions and intersections to `parseUnionOrIntersectionType` function', () => {
      expect(parseDeclarationType(parse(`let p: 'test1' | 'test2';`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parse(`let p: string | null;`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parse(`let p: boolean | true;`))).to.equal(SyntaxKind.BooleanKeyword);
      expect(parseDeclarationType(parse(`let p: string | number;`))).to.equal(SyntaxKind.ObjectKeyword);
      expect(parseDeclarationType(parse(`let p: Date & Object;`))).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
});
