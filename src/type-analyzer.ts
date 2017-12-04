import {
  BinaryExpression, createIdentifier, Expression, Identifier, LiteralTypeNode, Node, PartiallyEmittedExpression, PropertyDeclaration,
  SyntaxKind, TypeNode, TypeReferenceNode, UnionOrIntersectionTypeNode
} from "typescript";
import { hasOperator, hasOperatorToken, hasOriginalKeywordKind, InitializerWrapper, notTransparent } from "./helpers";

/**
 * Valid value types.
 */
export type ValidValue = string | number | boolean | object | Date | Array<any> | (() => ValidValue);

/**
 * Type of declaration
 */
export interface Type {
  type: SyntaxKind;
  proto?: Identifier;

}

/**
 * Type of declaration and initial value
 */
export interface TypeValue extends Type {
  value?: ValidValue;
}

export class Constructors {
  public static readonly Boolean = createIdentifier("Boolean");
  public static readonly Number = createIdentifier("Number");
  public static readonly String = createIdentifier("String");
  public static readonly Array = createIdentifier("Array");
  public static readonly Object = createIdentifier("Object");
  public static readonly Custom = (name) => createIdentifier(name);
  public static readonly of = (type: SyntaxKind) => {
    switch (type) {
      case SyntaxKind.BooleanKeyword:
        return Constructors.Boolean;
      case SyntaxKind.NumberKeyword:
        return Constructors.Number;
      case SyntaxKind.StringKeyword:
        return Constructors.String;
      case SyntaxKind.ArrayType:
        return Constructors.Array;
      default:
        return Constructors.Object;
    }
  }
}

/**
 * Get reduced kind of union or intersection. Transparent kinds are ignored.
 *
 * @param expr Union or Intersection expression to analyse
 *
 * @returns Reduced expression kind
 */
export function getUnionOrIntersectionKind(expr: UnionOrIntersectionTypeNode): Type {
  if (!expr.types) {
    return { type: SyntaxKind.Unknown };
  }

  return (expr.types as Array<TypeNode>)
    .filter(notTransparent)
    .map(getSimpleKind)
    .reduce((sum, kind) => {
      if (sum.proto.text !== kind.proto.text) {
        return { type: SyntaxKind.ObjectKeyword, proto: Constructors.Object };
      } else {
        return kind;
      }
    });
}

/**
 * Get type literal if available, otherwise return type itself.
 *
 * @param type Type node to check for literals
 *
 * @returns Type or type Literal
 */
export function getFinalType(type: Node): Node {
  if ("literal" in type) {
    return (type as LiteralTypeNode).literal;
  }
  return type;
}

/**
 * Get kind from non-expression type (or literal).
 *
 * @param type Type node to analyse
 *
 * @returns Kind of the type
 */
export function getSimpleKind(type: Node): Type {
  if (!type) {
    return { type: SyntaxKind.Unknown };
  }
  switch (getFinalType(type).kind) {
    case undefined:
      return { type: SyntaxKind.Unknown };
    case SyntaxKind.NumberKeyword:
    case SyntaxKind.NumericLiteral:
      return { type: SyntaxKind.NumberKeyword, proto: Constructors.Number };
    case SyntaxKind.BooleanKeyword:
    case SyntaxKind.TrueKeyword:
    case SyntaxKind.FalseKeyword:
      return { type: SyntaxKind.BooleanKeyword, proto: Constructors.Boolean };
    case SyntaxKind.ArrayType:
    case SyntaxKind.TupleType:
      return { type: SyntaxKind.ArrayType, proto: Constructors.Array };
    case SyntaxKind.StringKeyword:
    case SyntaxKind.StringLiteral:
    case SyntaxKind.NoSubstitutionTemplateLiteral:
      return { type: SyntaxKind.StringKeyword, proto: Constructors.String };
    case SyntaxKind.TypeReference:
      const name = (type as TypeReferenceNode).typeName.getText();
      if (name === "Array") {
        return { type: SyntaxKind.ArrayType, proto: Constructors.Array };
      }
      return { type: SyntaxKind.ObjectKeyword, proto: Constructors.Custom(name) };
    case SyntaxKind.AnyKeyword:
    case SyntaxKind.VoidKeyword:
    case SyntaxKind.NeverKeyword:
    case SyntaxKind.NullKeyword:
    case SyntaxKind.UndefinedKeyword:
      return { type: SyntaxKind.Unknown };
    default:
      return { type: SyntaxKind.ObjectKeyword, proto: Constructors.Object };
  }
}

/**
 * Get kind of an expression.
 *
 * @param expr Expression to analyse
 *
 * @returns Kind of the expression
 */
export function getExpressionKind(expr: Expression): Type {
  const numberOperators = [
    SyntaxKind.AsteriskToken,
    SyntaxKind.SlashToken,
    SyntaxKind.MinusToken,
    SyntaxKind.PercentToken,
    SyntaxKind.AsteriskAsteriskToken,
    SyntaxKind.AmpersandToken,
    SyntaxKind.BarToken,
    SyntaxKind.CaretToken,
    SyntaxKind.TildeToken,
    SyntaxKind.LessThanLessThanToken,
    SyntaxKind.GreaterThanGreaterThanToken,
    SyntaxKind.GreaterThanGreaterThanGreaterThanToken
  ];
  const booleanOperators = [
    SyntaxKind.EqualsEqualsToken,
    SyntaxKind.EqualsEqualsEqualsToken,
    SyntaxKind.GreaterThanToken,
    SyntaxKind.GreaterThanEqualsToken,
    SyntaxKind.LessThanToken,
    SyntaxKind.LessThanEqualsToken,
    SyntaxKind.ExclamationEqualsToken,
    SyntaxKind.ExclamationEqualsEqualsToken
  ];

  if (hasOperatorToken(expr)) {
    if (numberOperators.includes(expr.operatorToken.kind)) {
      return { type: SyntaxKind.NumberKeyword, proto: Constructors.Number };
    } else if (booleanOperators.includes(expr.operatorToken.kind)) {
      return { type: SyntaxKind.BooleanKeyword, proto: Constructors.Boolean };
    } else if (expr.operatorToken.kind === SyntaxKind.PlusToken) {
      const leftType = getExpressionKind(expr.left);
      const rightType = getExpressionKind(expr.right);
      if (leftType.type === SyntaxKind.StringKeyword || rightType.type === SyntaxKind.StringKeyword) {
        return { type: SyntaxKind.StringKeyword, proto: Constructors.String };
      } else {
        return { type: SyntaxKind.NumberKeyword, proto: Constructors.Number };
      }
    }
  } else if (hasOperator(expr)) {
    switch (expr.operator) {
      case SyntaxKind.TildeToken:
        return { type: SyntaxKind.NumberKeyword, proto: Constructors.Number };
      case SyntaxKind.ExclamationToken:
        return { type: SyntaxKind.BooleanKeyword, proto: Constructors.Boolean };
    }
  }
  return getSimpleKind(expr);
}

/**
 * Get kind from declaration type.
 *
 * @param declaration Declaration to analyse
 *
 * @returns Kind of the declaration type
 */
export function getDeclarationType(declaration: PropertyDeclaration): Type {
  const { type } = declaration;
  if (!type) {
    return { type: SyntaxKind.Unknown };
  }

  switch (type.kind) {
    case SyntaxKind.UnionType:
    case SyntaxKind.IntersectionType:
      return getUnionOrIntersectionKind(type as UnionOrIntersectionTypeNode);
    default:
      return getSimpleKind(type);
  }
}

/**
 * Get kind from declaration initializer.
 *
 * @param declaration Declaration to analyse
 *
 * @returns Kind of the declaration initializer and the value assigned
 */
export function parseDeclarationInitializer(declaration: PropertyDeclaration): TypeValue {
  const { initializer } = declaration;

  function defaultCase(proto?: Identifier): TypeValue {
    const type = getSimpleKind(initializer);
    const shouldWrap = [ SyntaxKind.ObjectKeyword, SyntaxKind.ArrayType ].includes(type.type);
    const value = shouldWrap ? new InitializerWrapper(initializer) : initializer.getText();
    return Object.assign(type, { value });
  }

  if (!initializer) {
    return { type: SyntaxKind.Unknown };
  }

  switch (hasOriginalKeywordKind(initializer) ? initializer.originalKeywordKind : initializer.kind) {
    case SyntaxKind.TrueKeyword:
      return { type: SyntaxKind.BooleanKeyword, value: true, proto: Constructors.Boolean };
    case SyntaxKind.FalseKeyword:
      return { type: SyntaxKind.BooleanKeyword, value: false, proto: Constructors.Boolean };
    case SyntaxKind.NumericLiteral:
      return { type: SyntaxKind.NumberKeyword, value: Number(initializer.getText()), proto: Constructors.Number };
    case SyntaxKind.TemplateExpression:
      return { type: SyntaxKind.StringKeyword, value: new InitializerWrapper(initializer), proto: Constructors.String };
    case SyntaxKind.ArrayLiteralExpression:
      return { type: SyntaxKind.ArrayType, value: new InitializerWrapper(initializer), proto: Constructors.Array };
    case SyntaxKind.NewExpression:
      const name = (initializer as PartiallyEmittedExpression).expression.getText();
      if (name === "Array") {
        return { type: SyntaxKind.ArrayType, value: new InitializerWrapper(initializer), proto: Constructors.Array };
      } else {
        return defaultCase(Constructors.Custom(name));
      }
    case SyntaxKind.BinaryExpression:
      return Object.assign(getExpressionKind(initializer as BinaryExpression), { value: new InitializerWrapper(initializer) });
    case SyntaxKind.NullKeyword:
      return { type: SyntaxKind.Unknown, value: null };
    case SyntaxKind.UndefinedKeyword:
      return { type: SyntaxKind.Unknown, value: undefined };
    case SyntaxKind.CallExpression:
    default:
      return defaultCase();
  }
}

/**
 * Get kind and initializer of the declaration.
 *
 * @param declaration Declaration to analyse
 *
 * @returns Type of declaration and initial value
 */
export function parseDeclaration(declaration: PropertyDeclaration): TypeValue {
  const { type: implicitType, proto: implicitProto } = getDeclarationType(declaration);
  const { type, value, proto } = parseDeclarationInitializer(declaration);
  return { type: implicitType || type, value, proto: implicitProto || proto };
}
