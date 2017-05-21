import {
  BinaryExpression, CallExpression, Expression, Node, PartiallyEmittedExpression, PropertyDeclaration, SyntaxKind,
  TypeNode, TypeReferenceNode, UnionOrIntersectionTypeNode
} from 'typescript';
import {
  isBinaryExpression, isIdentifier, isPrefixUnaryExpression, notTransparent, toFinalType, wrapValue
} from './helpers';

export type ValidValue = string | number | boolean | object | Date | Array<any> | (() => ValidValue);

export interface TypeAndValue {
  type: SyntaxKind;
  value?: ValidValue;
  isDate?: boolean;
}

export function typeToSimpleKind(type: Node): SyntaxKind {
  if (!type) {
    return SyntaxKind.Unknown;
  }
  switch (toFinalType(type).kind) {
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
}

export function parseUnionOrIntersectionType({ types = [] }: UnionOrIntersectionTypeNode): SyntaxKind {
  if (!types) {
    return SyntaxKind.Unknown;
  }

  return (types as Array<TypeNode>)
    .filter(notTransparent)
    .map(typeToSimpleKind)
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
    if (numberOperators.indexOf(expr.operatorToken.kind) !== -1) {
      return SyntaxKind.NumberKeyword;
    } else if (booleanOperators.indexOf(expr.operatorToken.kind) !== -1) {
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
  return typeToSimpleKind(expr);
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
      return typeToSimpleKind(type);
  }
}

export function parseDeclarationInitializer({ initializer }: PropertyDeclaration): TypeAndValue {
  function defaultCase() {
    const type = typeToSimpleKind(initializer);
    const valueText = initializer.getText();
    return {
      type,
      value: [ SyntaxKind.ObjectKeyword, SyntaxKind.ArrayType ].indexOf(type) !== -1 ? wrapValue(valueText) : valueText
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
      return { type: SyntaxKind.StringKeyword, value: wrapValue(initializer.getText()) };
    case SyntaxKind.ArrayLiteralExpression:
      return { type: SyntaxKind.ArrayType, value: wrapValue(initializer.getText()) };
    case SyntaxKind.NewExpression:
      switch ((initializer as PartiallyEmittedExpression).expression.getText()) {
        case 'Array':
          return { type: SyntaxKind.ArrayType, value: wrapValue(initializer.getText()) };
        case 'Date':
          return { type: SyntaxKind.ObjectKeyword, value: wrapValue(initializer.getText()), isDate: true };
        default:
          return defaultCase();
      }
    case SyntaxKind.BinaryExpression:
      return { type: parseExpression(initializer as BinaryExpression), value: wrapValue(initializer.getText()) };
    case SyntaxKind.NullKeyword:
      return { type: SyntaxKind.Unknown, value: null };
    case SyntaxKind.UndefinedKeyword:
      return { type: SyntaxKind.Unknown, value: undefined };
    case SyntaxKind.CallExpression:
      if ((initializer as CallExpression).expression.getText().startsWith('Date.')) {
        return { type: SyntaxKind.ObjectKeyword, value: wrapValue(initializer.getText()), isDate: true };
      } else {
        return defaultCase();
      }
    default:
      return defaultCase();
  }
}

export function getTypeAndValue(declaration: PropertyDeclaration): TypeAndValue {
  const implicitType = parseDeclarationType(declaration);
  const { type, value, isDate = false } = parseDeclarationInitializer(declaration);
  return { type: implicitType || type, value, isDate };
}
