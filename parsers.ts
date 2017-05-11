import {
  Identifier, LiteralTypeNode, Node, SyntaxKind, TypeNode, TypeReferenceNode, UnionOrIntersectionTypeNode,
  VariableDeclaration
} from 'typescript';

export const transparentTypes = [
  SyntaxKind.AnyKeyword,
  SyntaxKind.VoidKeyword,
  SyntaxKind.NeverKeyword,
  SyntaxKind.NullKeyword,
  SyntaxKind.UndefinedKeyword
];

export const nonTransparent = ({ kind }: Node): boolean => transparentTypes.indexOf(kind) === -1;
export const toFinalType = (type: Node): Node => 'literal' in type ? (type as LiteralTypeNode).literal : type;

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
      return SyntaxKind.StringKeyword;
    case SyntaxKind.TypeReference:
      if (((type as TypeReferenceNode).typeName as Identifier).text === 'Array') {
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
