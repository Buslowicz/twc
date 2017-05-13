import {
  BinaryExpression, Expression,
  LiteralTypeNode, Node, PartiallyEmittedExpression, PrefixUnaryExpression, SyntaxKind, TypeNode, TypeReferenceNode,
  UnionOrIntersectionTypeNode, VariableDeclaration
} from 'typescript';

type ValidValue = string | number | boolean | (() => any);

export interface TypeAndValue {
  type: SyntaxKind;
  value?: ValidValue;
}

export const transparentTypes = [
  SyntaxKind.AnyKeyword,
  SyntaxKind.VoidKeyword,
  SyntaxKind.NeverKeyword,
  SyntaxKind.NullKeyword,
  SyntaxKind.UndefinedKeyword
];

export const isBinaryExpression = (expression): expression is BinaryExpression => 'operatorToken' in expression;
export const isPrefixUnaryExpression = (expression): expression is PrefixUnaryExpression => 'operator' in expression;

export const nonTransparent = ({ kind }: Node): boolean => transparentTypes.indexOf(kind) === -1;
export const toFinalType = (type: Node): Node => 'literal' in type ? (type as LiteralTypeNode).literal : type;
export const wrapValue = (valueText: string): () => any => {
  const wrapper = new Function(`return ${valueText};`) as () => any;
  wrapper.toString = () => Function.prototype.toString.call(wrapper).replace('anonymous', '');
  return wrapper;
};

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
    .filter(nonTransparent)
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

export function parseDeclarationType({ type }: VariableDeclaration): SyntaxKind {
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

export function parseDeclarationInitializer({ initializer }: VariableDeclaration): TypeAndValue {
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

  switch (initializer.kind) {
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
      if ((initializer as PartiallyEmittedExpression).expression.getText() === 'Array') {
        return { type: SyntaxKind.ArrayType, value: wrapValue(initializer.getText()) };
      } else {
        return defaultCase();
      }
    case SyntaxKind.BinaryExpression:
      return { type: parseExpression(initializer as BinaryExpression), value: wrapValue(initializer.getText()) };
    default:
      return defaultCase();
  }
}

export function getTypeAndValue(declaration: VariableDeclaration): TypeAndValue {
  const implicitType = parseDeclarationType(declaration);
  const { type, value } = parseDeclarationInitializer(declaration);
  return { type: implicitType || type, value };
}
