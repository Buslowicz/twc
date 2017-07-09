/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import {
  BinaryExpression, CallExpression, ClassDeclaration, createSourceFile, ExpressionStatement, Identifier, isPropertyDeclaration,
  MethodDeclaration, NodeArray, PrefixUnaryExpression, PropertyDeclaration, ScriptTarget, SyntaxKind, UnionOrIntersectionTypeNode,
  VariableStatement
} from "typescript";
import { Component, Method, Property, Template } from "../src/builder";
import * as decoratorsMap from "../src/decorators";
import {
  flatExtends, flattenArray, getDecorators, getText, hasArguments, hasDecorator, hasModifier, hasOperator, hasOperatorToken,
  hasOriginalKeywordKind, inheritsFrom, InitializerWrapper, isAllOf, isExtendsDeclaration, isOneOf, isPrivate, isPublic, isStatic,
  isTransparent, Link, notPrivate, notPublic, notStatic, notTransparent, outPath, Ref, ReferencedExpression, toProperty, toString
} from "../src/helpers";
import {
  getFinalType, getSimpleKind, parseDeclaration, parseDeclarationInitializer, parseDeclarationType, parseExpression,
  parseUnionOrIntersectionType
} from "../src/type-analyzer";
import "./config.spec";
import "./targets/polymer1.spec";
import "./targets/polymer2.spec";

function parse<T>(src: string): T {
  return createSourceFile("", src, ScriptTarget.ES2015, true).statements[ 0 ] as any;
}

function parsVars(src: string): PropertyDeclaration {
  const statement: VariableStatement = createSourceFile("", src, ScriptTarget.ES2015, true).statements[ 0 ] as any;
  return statement.declarationList.declarations[ 0 ] as any;
}

function parseClass(src: string): ClassDeclaration {
  return createSourceFile("", src, ScriptTarget.ES2015, true).statements[ 0 ] as ClassDeclaration;
}

process.env[ "SILENT" ] = true;

describe("helpers", () => {
  // TODO: write Link tests
  // TODO: write Ref tests
  // TODO: write ReferencedExpression tests
  // TODO: write RefUpdaterMixin tests
  describe("InitializerWrapper()", () => {
    it("should wrap a value in a function", () => {
      expect(new InitializerWrapper(parsVars(`let x = 10`).initializer).valueOf()).to.equal(10);
      expect(new InitializerWrapper(parsVars(`let x = "test" + "ing"`).initializer).valueOf()).to.equal("testing");
      expect(new InitializerWrapper(parsVars(`let x = [1, 2, 3]`).initializer).valueOf()).to.deep.equal([ 1, 2, 3 ]);
      expect(new InitializerWrapper(parsVars(`let x = [1, 2, 3]`).initializer).valueOf()).to.not.equal(
        new InitializerWrapper(parsVars(`let x = [1, 2, 3]`).initializer).valueOf()
      );
      expect(new InitializerWrapper(parsVars(`let x = [1, 2, 3]`).initializer).valueOf()).to.deep.equal(
        new InitializerWrapper(parsVars(`let x = [1, 2, 3]`).initializer).valueOf()
      );
    });
  });
  // TODO: write ParsedDecorator tests
  describe("getDecorators()", () => {
    it("should return a list of parsed decorators (name and arguments object)", () => {
      expect(getDecorators(parseClass(`class T { @a(1) @b({a: true, b: 'test'}) @c @d() p;}`).members[ 0 ]).map((decor) => decor.valueOf()))
        .to.deep.equal(
        [
          { name: "a", arguments: [ 1 ] },
          { name: "b", arguments: [ { a: true, b: "test" } ] },
          { name: "c", arguments: undefined },
          { name: "d", arguments: [] }
        ]
      );
    });
    it("should create a method declaration named `_*propertyName*Computed` for function passed as arguments", () => {
      const method = getDecorators(parseClass(`class T { @a((a: string, b: number) => a.repeat(b)) p; }`).members[ 0 ])[ 0 ].arguments[ 0 ];
      expect(method).to.be.instanceof(Method);
      expect(method.name).to.equal("_pComputed");
      expect(method.toString()).to.equal("_pComputed(a: string, b: number) { return a.repeat(b); }");
    });
    it("should handle passing object references as a decorator argument", () => {
      const ref = getDecorators(parseClass(`class T { @a(someRef) p; }`).members[ 0 ])[ 0 ].arguments[ 0 ];
      expect(ref).to.be.instanceof(Ref);
      expect(ref.ref.getText()).to.equal("someRef");
      expect(ref.toString()).to.equal("someRef");
    });
    it("should handle expressions with references as a decorator argument", () => {
      const expr = getDecorators(parseClass(`class T { @a({ name: nameRef, value: valueRef }) p; }`).members[ 0 ])[ 0 ].arguments[ 0 ];
      expect(expr).to.be.instanceof(ReferencedExpression);
      expect(expr.toString()).to.equal("{ name: nameRef, value: valueRef }");
    });
  });
  describe("flatExtends", () => {
    it("should flatten chained extend mixins", () => {
      expect(flatExtends(parseClass(`class X extends A {}`).heritageClauses[ 0 ].types[ 0 ].expression)).to.deep.equal([ "A" ]);
      expect(flatExtends(parseClass(`class X extends A(B(C(D(E(F))))) {}`).heritageClauses[ 0 ].types[ 0 ].expression)).to.deep.equal([
        "A", "B", "C", "D", "E", "F"
      ]);
    });
  });
  describe("inheritsFrom", () => {
    it("should return whether class extends specified class", () => {
      expect(inheritsFrom(parseClass(`class X extends HTMLElement {}`), "HTMLElement")).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends Polymer.Element {}`), "Polymer.Element")).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends Y {}`), "Z")).to.be.false;
      expect(inheritsFrom(parseClass(`class X {}`), "Z")).to.be.false;
    });
    it("should return whether class extends specified mixin", () => {
      expect(inheritsFrom(parseClass(`class X extends A(B(C(D(E(Polymer.Element))))) {}`), "Polymer.Element")).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends A(B(C(Polymer.Element(E(F))))) {}`), "Polymer.Element")).to.be.true;
      expect(inheritsFrom(parseClass(`class X extends A(B(C(D(E(F))))) {}`), "X")).to.be.false;
    });
    it("should return whether interface extends specified interface", () => {
      expect(inheritsFrom(parseClass(`interface X extends A {}`), "A")).to.be.true;
      expect(inheritsFrom(parseClass(`interface X extends A {}`), "X")).to.be.false;
      expect(inheritsFrom(parseClass(`interface X extends A, B, C, D, E {}`), "B")).to.be.true;
      expect(inheritsFrom(parseClass(`interface X extends A, B, C, D, E {}`), "Z")).to.be.false;
    });
  });
  describe("hasModifier()", () => {
    it("should check if class member has a modifier", () => {
      expect(hasModifier(parseClass(`class T { readonly p; }`).members[ 0 ], SyntaxKind.ReadonlyKeyword)).to.be.true;
      expect(hasModifier(parseClass(`class T { public p; }`).members[ 0 ], SyntaxKind.PublicKeyword)).to.be.true;
      expect(hasModifier(parseClass(`class T { public p; }`).members[ 0 ], SyntaxKind.PrivateKeyword)).to.be.false;
    });
  });
  describe("hasDecorator()", () => {
    it("should check if class member has a decorator", () => {
      expect(hasDecorator(parseClass(`class T { @a p; }`).members[ 0 ], "a")).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a @b p; }`).members[ 0 ], "a")).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a @b p; }`).members[ 0 ], "b")).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a() p; }`).members[ 0 ], "a")).to.be.true;
      expect(hasDecorator(parseClass(`class T { @a() p; }`).members[ 0 ], "b")).to.be.false;
      expect(hasDecorator(parseClass(`class T { @a p; }`).members[ 0 ], "b")).to.be.false;
    });
  });
  describe("isOneOf", () => {
    it("should check if at least one of the filters pass on the item", () => {
      expect([ 1, 2, 3 ].filter(isOneOf((n) => n === 1, (n) => n === 2))).to.deep.equal([ 1, 2 ]);
      expect([ 1, 2, 3 ].filter(isOneOf((n) => n === "a", (n) => n === "b", (n) => n === "c"))).to.deep.equal([]);
    });
  });
  describe("isAllOf", () => {
    it("should check if all of the filters pass on the item", () => {
      expect([ 1, 2, 3 ].filter(isAllOf((n) => n > 1, (n) => n < 10))).to.deep.equal([ 2, 3 ]);
      expect([ 1, 2, 3 ].filter(isAllOf((n) => n === 1, (n) => n === 2, (n) => n === 3))).to.deep.equal([]);
    });
  });
  // TODO: write isImportDeclaration tests
  // TODO: write isInterfaceDeclaration tests
  // TODO: write isClassDeclaration tests
  // TODO: write isModuleDeclaration tests
  // TODO: write isTypeAliasDeclaration tests
  // TODO: write isVariableStatement tests
  // TODO: write isFunctionDeclaration tests
  // TODO: write isEnumDeclaration tests
  // TODO: write isExportDeclaration tests
  // TODO: write isExportAssignment tests
  // TODO: write isTemplateExpression tests
  describe("hasOperatorToken()", () => {
    it("should check if expression is a binary expression", () => {
      const expr = parsVars("let p = 5 * 5;").initializer;
      if (hasOperatorToken(expr)) {
        const binExpr: BinaryExpression = expr;
        expect(binExpr).to.not.be.null;
        expect(binExpr).to.contain.keys("operatorToken");
      } else {
        expect(expr).to.equal("BinaryExpression");
      }
    });
  });
  // TODO: write hasExpression tests
  describe("hasOperator()", () => {
    it("should check if expression is prefix unary expression", () => {
      const expr = parsVars("let p = ~5;").initializer;
      if (hasOperator(expr)) {
        const unaryExpr: PrefixUnaryExpression = expr;
        expect(unaryExpr).to.not.be.null;
        expect(unaryExpr).to.contain.keys("operator");
      } else {
        expect(expr).to.equal("PrefixUnaryExpression");
      }
    });
  });
  describe("hasArguments()", () => {
    it("should check if expression is call expression", () => {
      const expr = parsVars("let p = test();").initializer;
      if (hasArguments(expr)) {
        const callExpr: CallExpression = expr;
        expect(callExpr).to.not.be.null;
        expect(callExpr).to.contain.keys("arguments");
      } else {
        expect(expr).to.equal("CallExpression");
      }
    });
  });
  describe("hasOriginalKeywordKind()", () => {
    it("should check if expression is identifier", () => {
      const expr = parsVars("let p = undefined;").initializer;
      if (hasOriginalKeywordKind(expr)) {
        const identifier: Identifier = expr;
        expect(identifier).to.not.be.null;
        expect(identifier).to.contain.keys("originalKeywordKind");
      } else {
        expect(expr).to.equal("Identifier");
      }
    });
  });
  describe("isExtendsDeclaration()", () => {
    it("should check if heritage clause is extend declaration", () => {
      expect(isExtendsDeclaration(parseClass(`class X extends Y {}`).heritageClauses[ 0 ])).to.be.true;
    });
  });
  describe("isPrivate()", () => {
    it("should return true if class member is private", () => {
      expect(isPrivate(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(isPrivate(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(isPrivate(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe("isPublic()", () => {
    it("should return true if class member is public", () => {
      expect(isPublic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.true;
      expect(isPublic(parseClass(`class T { protected p; }`).members[ 0 ])).to.be.false;
      expect(isPublic(parseClass(`class T { public readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe("isStatic()", () => {
    it("should return true if class member is static", () => {
      expect(isStatic(parseClass(`class T { static p; }`).members[ 0 ])).to.be.true;
      expect(isStatic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(isStatic(parseClass(`class T { private static readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe("isTransparent()", () => {
    it("should return true if node kind is of transparent type (any, void, never, null, undefined)", () => {
      expect(isTransparent(parsVars(`let x: any;`).type)).to.be.true;
      expect(isTransparent(parsVars(`let x: void;`).type)).to.be.true;
      expect(isTransparent(parsVars(`let x: never;`).type)).to.be.true;
      expect(isTransparent(parsVars(`let x: null;`).type)).to.be.true;
      expect(isTransparent(parsVars(`let x: undefined;`).type)).to.be.true;
      expect(isTransparent(parsVars(`let x: number;`).type)).to.be.false;
      expect(isTransparent(parsVars(`let x: string;`).type)).to.be.false;
      expect(isTransparent(parsVars(`let x: boolean;`).type)).to.be.false;
      expect(isTransparent(parsVars(`let x: object;`).type)).to.be.false;
    });
  });
  describe("notPrivate()", () => {
    it("should return true if class member is not private", () => {
      expect(notPrivate(parseClass(`class T { private p; }`).members[ 0 ])).to.be.false;
      expect(notPrivate(parseClass(`class T { public p; }`).members[ 0 ])).to.be.true;
      expect(notPrivate(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.false;
    });
  });
  describe("notPublic()", () => {
    it("should return true if class member is not public", () => {
      expect(notPublic(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(notPublic(parseClass(`class T { public p; }`).members[ 0 ])).to.be.false;
      expect(notPublic(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe("notStatic()", () => {
    it("should return true if class member is not static", () => {
      expect(notStatic(parseClass(`class T { private p; }`).members[ 0 ])).to.be.true;
      expect(notStatic(parseClass(`class T { static p; }`).members[ 0 ])).to.be.false;
      expect(notStatic(parseClass(`class T { private readonly p; }`).members[ 0 ])).to.be.true;
    });
  });
  describe("notTransparent()", () => {
    it("should return true if node kind is not transparent type (any, void, never, null, undefined)", () => {
      expect(notTransparent(parsVars(`let x: any;`).type)).to.be.false;
      expect(notTransparent(parsVars(`let x: void;`).type)).to.be.false;
      expect(notTransparent(parsVars(`let x: never;`).type)).to.be.false;
      expect(notTransparent(parsVars(`let x: null;`).type)).to.be.false;
      expect(notTransparent(parsVars(`let x: undefined;`).type)).to.be.false;
      expect(notTransparent(parsVars(`let x: number;`).type)).to.be.true;
      expect(notTransparent(parsVars(`let x: string;`).type)).to.be.true;
      expect(notTransparent(parsVars(`let x: boolean;`).type)).to.be.true;
      expect(notTransparent(parsVars(`let x: object;`).type)).to.be.true;
    });
  });
  describe("toString()", () => {
    it("should run toString method on all items in an array", () => {
      expect([ "a", 2, [ 1, 2 ], true, {} ].map(toString)).to.deep.equal([ "a", "2", "1,2", "true", "[object Object]" ]);
    });
  });
  describe("getText()", () => {
    it("should run getText method on all items in an array", () => {
      expect(parseClass(`class X { a: string; b: number; c: boolean; }`).members.map(getText)).to.deep.equal([
        "a: string;", "b: number;", "c: boolean;"
      ]);
    });
  });
  describe("flattenArray()", () => {
    it("should flatten an array", () => {
      expect([ 1, 2, [ 3, 4 ] ].reduce(flattenArray, [])).to.deep.equal([ 1, 2, 3, 4 ]);
    });
  });
  describe("toProperty()", () => {
    it("should map an array of objects to an array of the specific properties", () => {
      expect([ { a: 1 }, { a: 2, b: 3 }, { a: 3, c: 5 } ].map(toProperty("a"))).to.deep.equal([ 1, 2, 3 ]);
    });
  });
  // TODO: write stripQuotes tests
  // TODO: write flattenChildren tests
  // TODO: write findNodeOfKind tests
  // TODO: write getQuoteChar tests
  // TODO: write getRoot tests
  // TODO: write updateImportedRefs tests
  describe("outPath()", () => {
    it("should calculate path with no rootDir and outDir", () => {
      expect(outPath("file.ts", { rootDir: "" })).to.equal("file.ts");
      expect(outPath("deep/file.ts", { rootDir: "" })).to.equal("deep/file.ts");
    });
    it("should calculate path with outDir set", () => {
      expect(outPath("file.ts", { rootDir: "", outDir: "dist" })).to.equal("dist/file.ts");
      expect(outPath("deep/file.ts", { rootDir: "", outDir: "dist" })).to.equal("dist/deep/file.ts");
    });
    it("should calculate path with rootDir set", () => {
      expect(outPath("src/file.ts", { rootDir: "src" })).to.equal("file.ts");
      expect(outPath("src/deep/file.ts", { rootDir: "src" })).to.equal("deep/file.ts");
    });
    it("should calculate path with both rootDir and outDir set", () => {
      expect(outPath("src/file.ts", { rootDir: "src", outDir: "dist" })).to.equal("dist/file.ts");
      expect(outPath("src/deep/file.ts", { rootDir: "src", outDir: "dist" })).to.equal("dist/deep/file.ts");
    });
  });
});
describe("type analyzer", () => {
  describe("parseUnionOrIntersectionType()", () => {
    it("should parsVars unions with same types", () => {
      expect(parseUnionOrIntersectionType(parsVars(`let p: string | string;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: number | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: boolean | boolean;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: Array<any> | Array<any>;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ArrayType);
    });
    it("should ignore transparent types when parsing unions", () => {
      expect(parseUnionOrIntersectionType(parsVars(`let p: string | null;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: null | string;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: string | any;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
    });
    it("should return ObjectKeyword for mixed types", () => {
      expect(parseUnionOrIntersectionType(parsVars(`let p: string | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: Array<number> | number;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
    });
    it("should parsVars literals unions", () => {
      expect(parseUnionOrIntersectionType(parsVars(`let p: 'a' | 'b';`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: 1 | 2;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseUnionOrIntersectionType(parsVars(`let p: 'a' | 1;`).type as UnionOrIntersectionTypeNode))
        .to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe("getFinalType()", () => {
    it("should return type of node or type of literal (if node is literal)", () => {
      expect(getFinalType(parsVars(`let x: string`).type).kind).to.equal(SyntaxKind.StringKeyword);
      expect(getFinalType(parsVars(`let x: 'test'`).type).kind).to.equal(SyntaxKind.StringLiteral);
      expect(getFinalType(parsVars(`let x: 10`).type).kind).to.equal(SyntaxKind.NumericLiteral);
    });
  });
  describe("getSimpleKind()", () => {
    it("should parsVars simple types", () => {
      expect(getSimpleKind(parsVars(`let p;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parsVars(`let p: string;`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(getSimpleKind(parsVars(`let p: number;`).type)).to.equal(SyntaxKind.NumberKeyword);
      expect(getSimpleKind(parsVars(`let p: boolean;`).type)).to.equal(SyntaxKind.BooleanKeyword);
      expect(getSimpleKind(parsVars(`let p: Array<boolean>;`).type)).to.equal(SyntaxKind.ArrayType);
    });
    it("should convert all TypeReferences to ObjectKeyword", () => {
      expect(getSimpleKind(parsVars(`let p: Date;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parsVars(`let p: Object;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parsVars(`let p: PolymerElement;`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parsVars(`let p: ENUM;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
    it("should ignore all transparent types and convert them to Unknown type", () => {
      expect(getSimpleKind(parsVars(`let p: null;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parsVars(`let p: undefined;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parsVars(`let p: any;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parsVars(`let p: void;`).type)).to.equal(SyntaxKind.Unknown);
      expect(getSimpleKind(parsVars(`let p: never;`).type)).to.equal(SyntaxKind.Unknown);
    });
    it("should parsVars literal types", () => {
      expect(getSimpleKind(parsVars(`let p: boolean[];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(getSimpleKind(parsVars(`let p: [ boolean ];`).type)).to.equal(SyntaxKind.ArrayType);
      expect(getSimpleKind(parsVars(`let p: [ string, number ];`).type)).to.equal(SyntaxKind.ArrayType);

      expect(getSimpleKind(parsVars(`let p: 'test';`).type)).to.equal(SyntaxKind.StringKeyword);
      expect(getSimpleKind(parsVars(`let p: { a: boolean, b: string };`).type)).to.equal(SyntaxKind.ObjectKeyword);
      expect(getSimpleKind(parsVars(`let p: () => string;`).type)).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe("parseExpression()", () => {
    it("should understand simple numeral expressions", () => {
      expect(parseExpression(parsVars("let p = 5 + 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 * 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 ** 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 * 5 * 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 - 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 / 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 % 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 & 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 | 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 ^ 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = ~5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 << 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 >> 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = 5 >>> 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
    });
    it("should understand simple boolean expressions", () => {
      expect(parseExpression(parsVars("let p = 5 == 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = 5 === 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = 5 != 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = 5 !== 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = 5 < 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = 5 <= 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = 5 > 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = 5 >= 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = !5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = !true;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
      expect(parseExpression(parsVars("let p = !'test';").initializer as BinaryExpression))
        .to.equal(SyntaxKind.BooleanKeyword);
    });
    it("should understand simple text expressions", () => {
      expect(parseExpression(parsVars("let p = \"a\" + \"b\";").initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
    });
    it("should understand mixed types simple expressions", () => {
      expect(parseExpression(parsVars("let p = \"a\" + 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
      expect(parseExpression(parsVars("let p = true * 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = window.innerWidth * 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = window.innerWidth + 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = (a || b) + 5;").initializer as BinaryExpression))
        .to.equal(SyntaxKind.NumberKeyword);
      expect(parseExpression(parsVars("let p = document.title + \" string\";").initializer as BinaryExpression))
        .to.equal(SyntaxKind.StringKeyword);
    });
  });
  describe("parseDeclarationType()", () => {
    it("should direct unions and intersections to `parseUnionOrIntersectionType` function", () => {
      expect(parseDeclarationType(parsVars(`let p: 'test1' | 'test2';`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parsVars(`let p: string | null;`))).to.equal(SyntaxKind.StringKeyword);
      expect(parseDeclarationType(parsVars(`let p: boolean | true;`))).to.equal(SyntaxKind.BooleanKeyword);
      expect(parseDeclarationType(parsVars(`let p: string | number;`))).to.equal(SyntaxKind.ObjectKeyword);
      expect(parseDeclarationType(parsVars(`let p: Date & Object;`))).to.equal(SyntaxKind.ObjectKeyword);
    });
  });
  describe("parseDeclarationInitializer()", () => {
    it("should return no value and type Unknown if there is no initializer", () => {
      expect(parseDeclarationInitializer(parsVars("let p;"))).to.deep.equal({
        type: SyntaxKind.Unknown
      });
      expect(parseDeclarationInitializer(parsVars("let p: string;"))).to.deep.equal({
        type: SyntaxKind.Unknown
      });
    });
    it("should get type and value from simple literal initializer", () => {
      expect(parseDeclarationInitializer(parsVars("let p = \"test\";"))).to.deep.equal({
        type: SyntaxKind.StringKeyword, value: "\"test\""
      });
      expect(parseDeclarationInitializer(parsVars("let p = true;"))).to.deep.equal({
        type: SyntaxKind.BooleanKeyword, value: true
      });
      expect(parseDeclarationInitializer(parsVars("let p = 10;"))).to.deep.equal({
        type: SyntaxKind.NumberKeyword, value: 10
      });
      expect(parseDeclarationInitializer(parsVars("let p = `25`;"))).to.deep.equal({
        type: SyntaxKind.StringKeyword, value: "`25`"
      });
    });
    it("should get type and value from complex initializer and wrap value with an anonymous function", () => {
      let initAndType = parseDeclarationInitializer(parsVars("let p = `${25}`;"));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return `${25}`; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = { a: true };"));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return { a: true }; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = ENUM.A;"));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return ENUM.A; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = () => \"test\";"));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return () => \"test\"; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = new Date();"));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return new Date(); }");

      initAndType = parseDeclarationInitializer(parsVars("let p = [ 1, 2, 3 ];"));
      expect(initAndType.type).to.equal(SyntaxKind.ArrayType);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return [ 1, 2, 3 ]; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = new Array(10);"));
      expect(initAndType.type).to.equal(SyntaxKind.ArrayType);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return new Array(10); }");
    });
    it("should get type and value from expressions", () => {
      let initAndType = parseDeclarationInitializer(parsVars("let p = 5 * 5 * 5;"));
      expect(initAndType.type).to.equal(SyntaxKind.NumberKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return 5 * 5 * 5; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = \"test\" + \"test\";"));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return \"test\" + \"test\"; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = 5 * innerWidth;"));
      expect(initAndType.type).to.equal(SyntaxKind.NumberKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return 5 * innerWidth; }");
    });
    it("should fallback to ObjectKeyword if no type was recognized", () => {
      let initAndType = parseDeclarationInitializer(parsVars("let p = window && window.opener;"));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " "))
        .to.equal("function () { return window && window.opener; }");

      initAndType = parseDeclarationInitializer(parsVars("let p = (window && window.opener);"));
      expect(initAndType.type).to.equal(SyntaxKind.ObjectKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " "))
        .to.equal("function () { return (window && window.opener); }");
    });
  });
  describe("parseDeclaration()", () => {
    it("should prefer implicit type over deducted one", () => {
      expect(parseDeclaration(parsVars("let p: number = null;")))
        .to.deep.equal({ type: SyntaxKind.NumberKeyword, value: null, isDate: false });
      expect(parseDeclaration(parsVars("let p: number = undefined;")))
        .to.deep.equal({ type: SyntaxKind.NumberKeyword, value: undefined, isDate: false });

      const initAndType = parseDeclaration(parsVars("let p: string = document.title;"));
      expect(initAndType.type).to.equal(SyntaxKind.StringKeyword);
      expect(initAndType.value.toString().replace(/\s+/g, " ")).to.equal("function () { return document.title; }");
    });
  });
});
describe("builders", () => {
  // TODO: write ImportedNode tests
  // TODO: write Import tests
  // TODO: write Style tests
  // TODO: write RegisteredEvent tests
  describe("Property()", () => {
    it("should parsVars properties", () => {
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
        .filter(isPropertyDeclaration)
        .filter(notPrivate)
        .filter(notStatic)
        .map((property: PropertyDeclaration) => new Property(property, property.name.getText()))
        .map((property) => `${property.jsDoc}${property.name}: ${property}`)
      ).to.deep.equal([
        "t1: { type: String,value: function () {\nreturn document.title;\n},readOnly: true }",
        "t2: { type: String,value: \"test\" }",
        "t3: String",
        "/** Some test property */\ntest1: { type: Date,value: function () {\nreturn Date.now();\n} }",
        "test2: { type: Date,value: function () {\nreturn new Date();\n} }",
        "attr: { type: String,value: null }",
        "computed1: String",
        "computed2: String"
      ]);
    });
  });
  describe("Method()", () => {
    const method = parsVars(`let x = function(a, b) { return a + b; }`).initializer as any as MethodDeclaration;
    it("should parsVars a function expression and return a function", () => {
      expect(new Method(method).toString()).to.equal(`function(a, b) { return a + b; }`);
    });
    it("should name a function if name was provided", () => {
      expect(new Method(method, "testFun").toString()).to.equal(`testFun(a, b) { return a + b; }`);
      expect(new Method(method, "testFun").name).to.equal("testFun");
    });
  });
  describe("Component()", () => {
    it("should save the class name", () => {
      expect(new Component(parseClass(`class Test {}`)).name).to.equal("Test");
    });
    it("should save super class", () => {
      expect(new Component(parseClass(`class Test extends X(Y(Z)) implements A, B {}`)).heritage).to.equal("X(Y(Z))");
    });
    it("should use template method to get the template", () => {
      expect(new Component(parseClass(`class Test {
        name: string;
        lastName: string;

        template() {
          return \`<h1>\${this.lastName}</h1> <h2>\${this.name}</h2>\`;
        }
      }`)).template.toString()).to.equal("<h1>{{lastName}}</h1> <h2>{{name}}</h2>");
    });
    it("should parsVars class correctly and build valid properties and methods", () => {
      let element = new Component(parseClass(`class Test {
      public readonly t1: string = document.title;
      t2 = "test";
      t3: string;
      private helper: string;
      undef = undefined;
      custom: CustomObject = new CustomObject();
      called: boolean = someFunc();
      /** Some test property */
      test1: Date = Date.now();
      test2: Date = new Date();
      @attr @test('true') attr: string = null;
      @compute("compute", ["test1", "test2"]) computed1: string;
      @compute(function(t1: string, t2: string) { return t1 + t2; }, ["test1", 'test2']) computed2: string;

      testFun() { return 10; }
    }`));

      expect(element[ "properties" ].size).to.equal(11);
      expect(element[ "methods" ].size).to.equal(2);

      expect(Array.from(element[ "properties" ].values()).map((prop) => `${prop.jsDoc}${prop.name}: ${prop}`)).to.deep.equal([
        "t1: { type: String,value: function () {\nreturn document.title;\n},readOnly: true }",
        "t2: { type: String,value: \"test\" }",
        "t3: String",
        "undef: Object",
        "custom: { type: Object,value: function () {\nreturn new CustomObject();\n} }",
        "called: { type: Boolean,value: function () {\nreturn someFunc();\n} }",
        "/** Some test property */\ntest1: { type: Date,value: function () {\nreturn Date.now();\n} }",
        "test2: { type: Date,value: function () {\nreturn new Date();\n} }",
        "attr: { type: String,value: null,reflectToAttribute: true }",
        "computed1: { type: String,computed: \"compute(test1, test2)\" }",
        "computed2: { type: String,computed: \"_computed2Computed(test1, test2)\" }"
      ]);
      expect(Array.from(element[ "methods" ].values()).map(toString)).to.deep.equal([
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

      expect(element[ "properties" ].size).to.equal(4);
      expect(element[ "methods" ].size).to.equal(9);

      expect(Array.from(element[ "properties" ].values()).map((prop) => `${prop.jsDoc}${prop.name}: ${prop}`)).to.deep.equal([
        "testValue: String",
        "value: { type: String,value: \"\",reflectToAttribute: true,observer: \"valueChanged\" }",
        "symbols: { type: Array,value: function () {\nreturn [\n          InputMath.SYMBOLS_BASIC,\n          " +
        "InputMath.SYMBOLS_GREEK\n        ];\n},notify: true }",
        "showSymbols: { type: String,value: \"\",observer: \"symbolsChanged\" }"
      ]);

      //noinspection TsLint
      expect(Array.from(element[ "methods" ].values()).map(toString)).to.deep.equal([
        "constructor() { super();\nvar editor: HTMLElement = this._editor;\neditor.id = \"editor\";\neditor.classList" +
        ".add(\"input-math\");\nthis[ \"_mathField\" ] = MathQuill.getInterface(2).MathField(editor, {\n            s" +
        "paceBehavesLikeTab: true,\n            handlers: {\n              edit: this._updateValue.bind(this)\n      " +
        "      }\n          }); }",
        "ready() { this.insertBefore(this._editor, this.$.controls); }",
        "cmd(ev: PolymerEvent) { this._mathField.cmd(ev.model.item.cmd).focus(); }",
        "undo() { if (this._history && this._history.length > 0) {\n            this._freezeHistory = true;\n        " +
        "    this.value = this._history.pop();\n            this._freezeHistory = false;\n          } }",
        "valueChanged(value: string, prevValue: string) { this._updateHistory(prevValue);\nif (this._observerLocked) " +
        "{\n            return;\n          }\nthis._mathField.select().write(value);\nif (this._mathField.latex() ===" +
        " \"\") {\n            this.undo();\n          } }",
        "symbolsChanged(symbols: string) { if (symbols) {\n            this.symbols = symbols.split(\",\").map(groupN" +
        "ame => {\n              return InputMath[ \"SYMBOLS_\" + groupName.toUpperCase() ] || [];\n            });\n" +
        "          } }",
        "keyShortcuts(ev: KeyboardEvent) { if (ev.ctrlKey && ev.keyCode === 90) {\n            this.undo();\n        " +
        "  } }",
        "_updateValue(test: { a: () => void, b: any }) { console.log(test);\nthis._observerLocked = true;\nthis.value" +
        " = this._mathField.latex();\nthis._observerLocked = false; }",
        "_updateHistory(prevValue: string) { if (!this._history) {\n            this._history = [];\n          }\nif " +
        "(this._freezeHistory || prevValue == null) {\n            return;\n          }\nthis._history.push(prevValue" +
        ");\nif (this._history.length > InputMath.HISTORY_SIZE) {\n            this._history.shift();\n          } }"
      ]);

      //noinspection TsLint
      const stat = Array.from(element[ "staticProperties" ].values()).map(({ name, value }) => ({ name, value }));
      expect(stat.map(({ name }) => name)).to.deep.equal([
        "HISTORY_SIZE", "SYMBOLS_BASIC", "SYMBOLS_GREEK", "SYMBOLS_PHYSICS"
      ]);
      expect(stat.map(({ value }) => value instanceof InitializerWrapper ? value.valueOf() : value)).to.deep.equal([
        20,
        [ { cmd: "sqrt", name: "√" }, { cmd: "div", name: "÷" } ],
        [ { cmd: "gamma", name: "γ" }, { cmd: "Delta", name: "Δ" } ],
        [ { cmd: "ohm", name: "Ω" }, { cmd: "phi", name: "ᶲ", className: "big" } ]
      ]);

      expect(Array.from(element[ "staticMethods" ].values()).map(({ name, statements }) => ({ name, statements })))
        .to.deep.equal([ { name: "testMe", statements: [ "return true;" ] } ]);

      expect(element[ "observers" ]).to.deep.equal([
        "_updateValue(testValue, symbols)"
      ]);
    });
  });
  // TODO: write Module tests
});
describe("decorators", () => {
  describe("@attr()", () => {
    it("should set `reflectToAttribute` flag on provided property to true", () => {
      const prop = {} as Property;
      decoratorsMap.attr.call(null, prop);
      expect(prop.reflectToAttribute).to.be.true;
    });
  });
  describe("@compute()", () => {
    const declaration = parse<Identifier>(`let x = "a"`);
    it("should set `computed` to be a provided method name with provided arguments (if provided a string)", () => {
      const prop = {} as Property;
      decoratorsMap.compute.call({ declaration }, prop, "computed", [ "a", "b" ]);
      expect(prop.computed).to.equal("\"computed(a, b)\"");
    });
    it("should set a `computed` to be a name of provided function and arguments (if provided a function)", () => {
      const prop = {} as Property;
      const expression = parse<ExpressionStatement>("(a, b) => a + b)").expression as any;
      decoratorsMap.compute.call({ declaration }, prop, new Method(expression, "computed"), [ "a", "b" ]);
      expect(prop.computed).to.equal("\"computed(a, b)\"");
    });
    it("should return an array containing method declaration if provided a function as ", () => {
      const prop = {} as Property;
      const expression = parse<ExpressionStatement>("(a, b) => a + b)").expression as any;
      const [ method ] = decoratorsMap.compute.call({ declaration }, prop, new Method(expression, "computed"), [ "a", "b" ]).methods;
      expect(method).to.be.instanceof(Method);
      expect(method.name).to.equal("computed");
      expect(method.toString()).to.equal("computed(a, b) { return a + b; }");
    });
    it("should use arguments names if no properties were provided", () => {
      const prop = {} as Property;
      const expression = parse<ExpressionStatement>("(a, b) => a + b)").expression as any;
      decoratorsMap.compute.call({ declaration }, prop, new Method(expression, "computed"));
      expect(prop.computed).to.equal("\"computed(a, b)\"");
    });
  });
  describe("@notify()", () => {
    it("should set `notify` flag on provided property to true", () => {
      const prop = {} as Property;
      decoratorsMap.notify.call(null, prop);
      expect(prop.notify).to.be.true;
    });
  });
  describe("@observe()", () => {
    const declaration = parse<Identifier>(`let x = "a"`);
    it("should return an array containing object with `name` of property and method name as `observer` if observing single prop", () => {
      const { properties: [ property ] } = decoratorsMap.observe.call({ declaration }, { name: "observerMethod" } as Method, "prop");
      expect(property).to.deep.equal({ name: "prop", observer: "\"observerMethod\"" });
    });
    it("should return an array containing method name and all properties as arguments if observing multiple properties", () => {
      const { observers: [ observer ] } = decoratorsMap.observe.call({ declaration }, { name: "observerMethod" } as Method, "p1", "p2");
      expect(observer).to.equal("observerMethod(p1, p2)");
    });
    it("should use arguments names if no properties were provided", () => {
      const functionDeclaration = parsVars("let x = function(prop1: string, prop2: string) { return prop1 + prop2; }").initializer;
      const method = new Method(functionDeclaration as any, "observerMethod");
      const { observers: [ observer ] } = decoratorsMap.observe.call({ declaration }, method);
      expect(observer).to.equal("observerMethod(prop1, prop2)");
    });
    it("should add observer to observers array if path is provided instead of property name", () => {
      const { observers: [ observer ] } = decoratorsMap.observe.call({ declaration }, { name: "observerMethod" } as Method, "prop.deep");
      expect(observer).to.equal("observerMethod(prop.deep)");
    });
  });
  describe("@style()", () => {
    it("should set styles to an array of size equal to number of provided declarations", () => {
      const component = {} as Component;
      decoratorsMap.style.call(null, component, "my-styles1", "my-styles2", "my-styles3");
      expect(component.styles).to.have.lengthOf(3);
    });
    it("should set styles to an array containing a Link object with provided uri if css file path is provided", () => {
      const component = {} as Component;
      decoratorsMap.style.call(null, component, "file.css");
      const [ { style } ] = component.styles;
      expect(style).to.be.instanceof(Link);
      expect((style as Link).uri).to.equal("file.css");
    });
    it("should set styles to an array containing object with provided style and type `inline` if css was provided", () => {
      const component = {} as Component;
      decoratorsMap.style.call(null, component, ":host { color: red; }");
      const [ { style, isShared } ] = component.styles;
      expect(style).to.equal(":host { color: red; }");
      expect(isShared).to.equal(false);
    });
    it("should set styles to an array containing object with component name and type `shared` if shared style was provided", () => {
      const component = {} as Component;
      decoratorsMap.style.call(null, component, "my-styles");
      const [ { style, isShared } ] = component.styles;
      expect(style).to.equal("my-styles");
      expect(isShared).to.equal(true);
    });
    it("should set styles to an array of mixed style declarations types", () => {
      const component = {} as Component;
      decoratorsMap.style.call(null, component, "file.css", "my-styles", ":host { color: red; }");
      expect(component.styles).to.deep.equal([
        {
          isShared: false,
          style: {
            source: undefined,
            uri: "file.css"
          }
        },
        {
          isShared: true,
          style: "my-styles"
        },
        {
          isShared: false,
          style: ":host { color: red; }"
        }
      ]);
    });
  });
  describe("@template()", () => {
    it("should set template to be a Link if provided html file path", () => {
      const component = {} as Component;
      decoratorsMap.template.call(null, component, "template.html");
      const template = component.template[ "link" ] as Link;
      expect(template).to.be.instanceof(Link);
      expect(template.uri).to.equal("template.html");
    });

    it("should set template to be as provided", () => {
      const component = {} as Component;
      decoratorsMap.template.call(null, component, "<h1>Hello World</h1>");
      expect(component.template.toString()).to.equal("<h1>Hello World</h1>");
    });
  });
});
describe("template", () => {
  describe("expression binding", () => {
    it("should recognize expressions", () => {
      const { members } = parseClass(`class Test {
        prop: string;
        t1() {
          return \`<h1>Hello World</h1>\`;
        }
        t2() {
          return "<h1>Hello World</h1>";
        }
        t3() {
          return \`<h1>Hello $\{this.prop} World $\{this.prop + "test"} ! $\{this.prop === "test"}</h1>\`;
        }
      }`) as any as { members: NodeArray<MethodDeclaration> };

      const template1 = new Template((members[ 1 ].body.statements.reduce((p, c) => c) as ExpressionStatement).expression as any);
      expect(template1.toString()).to.equal("<h1>Hello World</h1>");
      expect(template1.methods.size).to.equal(0);

      const template2 = new Template((members[ 2 ].body.statements.reduce((p, c) => c) as ExpressionStatement).expression as any);
      expect(template2.toString()).to.equal("<h1>Hello World</h1>");
      expect(template2.methods.size).to.equal(0);

      const template3 = new Template((members[ 3 ].body.statements.reduce((p, c) => c) as ExpressionStatement).expression as any);
      expect(template3.toString()).to.equal("<h1>Hello {{prop}} World [[_expr0(prop)]] ! [[_expr1(prop)]]</h1>");
      expect(template3.methods.size).to.equal(2);
      expect(template3.methods.get("this.prop + \"test\"").toString()).to.deep.equal("_expr0(prop) { return this.prop + \"test\"; }");
      expect(template3.methods.get("this.prop === \"test\"").toString()).to.deep.equal("_expr1(prop) { return this.prop === \"test\"; }");
    });
  });
});
