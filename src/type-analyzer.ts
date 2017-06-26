import {
  BinaryExpression, CallExpression, Expression, LiteralTypeNode, Node, PartiallyEmittedExpression, PropertyDeclaration, SyntaxKind,
  TypeNode, TypeReferenceNode, UnionOrIntersectionTypeNode
} from "typescript";
import { InitializerWrapper, isBinaryExpression, isIdentifier, isPrefixUnaryExpression, notTransparent } from "./helpers";

/**
 * Valid value types.
 */
export type ValidValue = string | number | boolean | object | Date | Array<any> | (() => ValidValue);

/**
 * Type and value from analysing type. If the type is a Date, type Object is returned and isDate is set to true.
 */
export interface TypeAndValue {
  type: SyntaxKind;
  value?: ValidValue;
  isDate?: boolean;
}

/**
 * Get reduced kind of union or intersection. Transparent kinds are ignored.
 *
 * @param expr Union or Intersection expression to analyse
 *
 * @returns Reduced expression kind
 */
export function parseUnionOrIntersectionType(expr: UnionOrIntersectionTypeNode): SyntaxKind {
  if (!expr.types) {
    return SyntaxKind.Unknown;
  }

  return (expr.types as Array<TypeNode>)
    .filter(notTransparent)
    .map(getSimpleKind)
    .reduce((sum, kind) => {
      if (sum === SyntaxKind.ObjectKeyword || sum !== kind) {
        return SyntaxKind.ObjectKeyword;
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
export function getSimpleKind(type: Node): SyntaxKind {
  if (!type) {
    return SyntaxKind.Unknown;
  }
  switch (getFinalType(type).kind) {
    case undefined:
      return SyntaxKind.Unknown;
    case SyntaxKind.NumberKeyword:
    case SyntaxKind.NumericLiteral:
      return SyntaxKind.NumberKeyword;
    case SyntaxKind.BooleanKeyword:
    case SyntaxKind.TrueKeyword:
    case SyntaxKind.FalseKeyword:
      return SyntaxKind.BooleanKeyword;
    case SyntaxKind.ArrayType:
    case SyntaxKind.TupleType:
      return SyntaxKind.ArrayType;
    case SyntaxKind.StringKeyword:
    case SyntaxKind.StringLiteral:
    case SyntaxKind.NoSubstitutionTemplateLiteral:
      return SyntaxKind.StringKeyword;
    case SyntaxKind.TypeReference:
      if ((type as TypeReferenceNode).typeName.getText() === "Array") {
        return SyntaxKind.ArrayType;
      }
      return SyntaxKind.ObjectKeyword;
    case SyntaxKind.AnyKeyword:
    case SyntaxKind.VoidKeyword:
    case SyntaxKind.NeverKeyword:
    case SyntaxKind.NullKeyword:
    case SyntaxKind.UndefinedKeyword:
      return SyntaxKind.Unknown;
    default:
      return SyntaxKind.ObjectKeyword;
  }
}

/**
 * Get kind of an expression.
 *
 * @param expr Expression to analyse
 *
 * @returns Kind of the expression
 */
export function parseExpression(expr: Expression): SyntaxKind {
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

  if (isBinaryExpression(expr)) {
    if (numberOperators.includes(expr.operatorToken.kind)) {
      return SyntaxKind.NumberKeyword;
    } else if (booleanOperators.includes(expr.operatorToken.kind)) {
      return SyntaxKind.BooleanKeyword;
    } else if (expr.operatorToken.kind === SyntaxKind.PlusToken) {
      const leftType = parseExpression(expr.left);
      const rightType = parseExpression(expr.right);
      if (leftType === SyntaxKind.StringKeyword || rightType === SyntaxKind.StringKeyword) {
        return SyntaxKind.StringKeyword;
      } else {
        return SyntaxKind.NumberKeyword;
      }
    }
  } else if (isPrefixUnaryExpression(expr)) {
    switch (expr.operator) {
      case SyntaxKind.TildeToken:
        return SyntaxKind.NumberKeyword;
      case SyntaxKind.ExclamationToken:
        return SyntaxKind.BooleanKeyword;
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
export function parseDeclarationType(declaration: PropertyDeclaration): SyntaxKind {
  const { type } = declaration;
  if (!type) {
    return SyntaxKind.Unknown;
  }

  switch (type.kind) {
    case SyntaxKind.UnionType:
    case SyntaxKind.IntersectionType:
      return parseUnionOrIntersectionType(type as UnionOrIntersectionTypeNode);
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
export function parseDeclarationInitializer(declaration: PropertyDeclaration): TypeAndValue {
  const { initializer } = declaration;

  function defaultCase() {
    const type = getSimpleKind(initializer);
    return {
      type,
      value: [ SyntaxKind.ObjectKeyword, SyntaxKind.ArrayType ].includes(type) ? new InitializerWrapper(initializer) : initializer.getText()
    };
  }

  if (!initializer) {
    return { type: SyntaxKind.Unknown };
  }

  switch (isIdentifier(initializer) ? initializer.originalKeywordKind : initializer.kind) {
    case SyntaxKind.TrueKeyword:
      return { type: SyntaxKind.BooleanKeyword, value: true };
    case SyntaxKind.FalseKeyword:
      return { type: SyntaxKind.BooleanKeyword, value: false };
    case SyntaxKind.NumericLiteral:
      return { type: SyntaxKind.NumberKeyword, value: Number(initializer.getText()) };
    case SyntaxKind.TemplateExpression:
      return { type: SyntaxKind.StringKeyword, value: new InitializerWrapper(initializer) };
    case SyntaxKind.ArrayLiteralExpression:
      return { type: SyntaxKind.ArrayType, value: new InitializerWrapper(initializer) };
    case SyntaxKind.NewExpression:
      switch ((initializer as PartiallyEmittedExpression).expression.getText()) {
        case "Array":
          return { type: SyntaxKind.ArrayType, value: new InitializerWrapper(initializer) };
        case "Date":
          return { type: SyntaxKind.ObjectKeyword, value: new InitializerWrapper(initializer), isDate: true };
        default:
          return defaultCase();
      }
    case SyntaxKind.BinaryExpression:
      return { type: parseExpression(initializer as BinaryExpression), value: new InitializerWrapper(initializer) };
    case SyntaxKind.NullKeyword:
      return { type: SyntaxKind.Unknown, value: null };
    case SyntaxKind.UndefinedKeyword:
      return { type: SyntaxKind.Unknown, value: undefined };
    case SyntaxKind.CallExpression:
      if ((initializer as CallExpression).expression.getText().startsWith("Date.")) {
        return { type: SyntaxKind.ObjectKeyword, value: new InitializerWrapper(initializer), isDate: true };
      } else {
        return defaultCase();
      }
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
export function parseDeclaration(declaration: PropertyDeclaration): TypeAndValue {
  const implicitType = parseDeclarationType(declaration);
  const { type, value, isDate = false } = parseDeclarationInitializer(declaration);
  return { type: implicitType || type, value, isDate };
}
