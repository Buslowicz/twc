import {
  BinaryExpression, ClassElement, Identifier, LiteralTypeNode, Node, PrefixUnaryExpression, SyntaxKind
} from 'typescript';
export const transparentTypes = [
  SyntaxKind.AnyKeyword,
  SyntaxKind.VoidKeyword,
  SyntaxKind.NeverKeyword,
  SyntaxKind.NullKeyword,
  SyntaxKind.UndefinedKeyword
];

export const isBinaryExpression = (expression): expression is BinaryExpression => 'operatorToken' in expression;
export const isPrefixUnaryExpression = (expression): expression is PrefixUnaryExpression => 'operator' in expression;
export const isIdentifier = (expression): expression is Identifier => 'originalKeywordKind' in expression;

export const hasModifier = ({ modifiers }: ClassElement, mod: SyntaxKind): boolean => {
  return modifiers ? modifiers.some(({ kind }) => kind === mod) : false;
};
export const hasDecorator = ({ decorators }: ClassElement, decoratorName: string): boolean => {
  return decorators ? decorators.some(({ expression }) => expression.getText() === decoratorName) : false;
};

export const isPrivate = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.PrivateKeyword);
export const notPrivate = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.PrivateKeyword);
export const isPublic = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.PublicKeyword);
export const notPublic = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.PublicKeyword);
export const isStatic = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.StaticKeyword);
export const notStatic = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.StaticKeyword);
export const isProperty = ({ kind }: ClassElement): boolean => kind === SyntaxKind.PropertyDeclaration;
export const notProperty = ({ kind }: ClassElement): boolean => kind !== SyntaxKind.PropertyDeclaration;
export const isMethod = ({ kind }: ClassElement) => {
  return [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ].indexOf(kind) !== -1;
};
export const notMethod = ({ kind }: ClassElement) => {
  return [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ].indexOf(kind) === -1;
};
export const isGetter = ({ kind }: ClassElement): boolean => kind === SyntaxKind.GetAccessor;
export const notGetter = ({ kind }: ClassElement): boolean => kind !== SyntaxKind.GetAccessor;
export const isSetter = ({ kind }: ClassElement): boolean => kind === SyntaxKind.SetAccessor;
export const notSetter = ({ kind }: ClassElement): boolean => kind !== SyntaxKind.SetAccessor;

export const nonTransparent = ({ kind }: Node): boolean => transparentTypes.indexOf(kind) === -1;
export const toFinalType = (type: Node): Node => 'literal' in type ? (type as LiteralTypeNode).literal : type;
export const wrapValue = (valueText: string): () => any => {
  const wrapper = new Function(`return ${valueText};`) as () => any;
  wrapper.toString = () => Function.prototype.toString.call(wrapper).replace('anonymous', '');
  return wrapper;
};
