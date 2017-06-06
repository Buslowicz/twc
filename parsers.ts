import {
  BinaryExpression, CallExpression, Expression, LiteralTypeNode, Node, PartiallyEmittedExpression, PropertyDeclaration, SyntaxKind,
  TypeNode, TypeReferenceNode, UnionOrIntersectionTypeNode
} from 'typescript';
import { InitializerWrapper, isBinaryExpression, isIdentifier, isPrefixUnaryExpression, notTransparent } from './helpers';

export type ValidValue = string | number | boolean | object | Date | Array<any> | (() => ValidValue);

export interface TypeAndValue {
  type: SyntaxKind;
  value?: ValidValue;
  isDate?: boolean;
}

export function parseUnionOrIntersectionType({ types = [] }: UnionOrIntersectionTypeNode): SyntaxKind {
  if (!types) {
    return SyntaxKind.Unknown;
  }

  return (types as Array<TypeNode>)
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
    }
  }
  return getSimpleKind(expr);
}

export function parseDeclarationType({ type }: PropertyDeclaration): SyntaxKind {
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

export function parseDeclarationInitializer({ initializer }: PropertyDeclaration): TypeAndValue {
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
        case 'Array':
          return { type: SyntaxKind.ArrayType, value: new InitializerWrapper(initializer) };
        case 'Date':
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
      if ((initializer as CallExpression).expression.getText().startsWith('Date.')) {
        return { type: SyntaxKind.ObjectKeyword, value: new InitializerWrapper(initializer), isDate: true };
      } else {
        return defaultCase();
      }
    default:
      return defaultCase();
  }
}

export const getFinalType = (type: Node): Node => 'literal' in type ? (type as LiteralTypeNode).literal : type;
export const getSimpleKind = (type: Node): SyntaxKind => {
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
      if ((type as TypeReferenceNode).typeName.getText() === 'Array') {
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
};

export function getTypeAndValue(declaration: PropertyDeclaration): TypeAndValue {
  const implicitType = parseDeclarationType(declaration);
  const { type, value, isDate = false } = parseDeclarationInitializer(declaration);
  return { type: implicitType || type, value, isDate };
}
