import {
  BinaryExpression, Block, CallExpression, ClassElement, ExpressionStatement, FunctionExpression,
  GetAccessorDeclaration, Identifier,
  MethodDeclaration, Node, PrefixUnaryExpression, PropertyDeclaration, SetAccessorDeclaration, SyntaxKind
} from 'typescript';
import { Method } from './builder';

export interface ParsedDecorator {
  name: string;
  arguments?: Array<any>;
}

export const transparentTypes = [
  SyntaxKind.AnyKeyword,
  SyntaxKind.VoidKeyword,
  SyntaxKind.NeverKeyword,
  SyntaxKind.NullKeyword,
  SyntaxKind.UndefinedKeyword
];

export const getDecorators = (declaration: ClassElement): Array<ParsedDecorator> => {
  if (!declaration.decorators) {
    return [];
  }
  return declaration.decorators.map(({ expression }) => {
    if (isCallExpression(expression)) {
      const name = expression.expression.getText();
      const args = expression.arguments.map((arg) => {
        switch (arg.kind) {
          case SyntaxKind.ArrowFunction:
          case SyntaxKind.FunctionExpression:
            return new Method(arg as FunctionExpression, `_${declaration.name.getText()}Computed`);
          default:
            return new Function(`return ${arg.getText()}`)();
        }
      });
      return { arguments: args, name };
    }
    return { name: expression.getText() };
  });
};

export const hasModifier = (declaration: ClassElement, mod: SyntaxKind): boolean => {
  return declaration.modifiers ? declaration.modifiers.some(({ kind }) => kind === mod) : false;
};
export const hasDecorator = (declaration: ClassElement, decoratorName: string): boolean => {
  if (!declaration.decorators) {
    return false;
  }
  return declaration.decorators.some(({ expression }) => {
    return (isExpressionStatement(expression) ? expression.expression : expression).getText() === decoratorName;
  });
};

export const isBinaryExpression = (expression: Node): expression is BinaryExpression => 'operatorToken' in expression;
export const isExpressionStatement = (expression: Node): expression is ExpressionStatement => 'expression' in expression;
export const isPrefixUnaryExpression = (expression: Node): expression is PrefixUnaryExpression => 'operator' in expression;
export const isCallExpression = (expression: Node): expression is CallExpression => 'arguments' in expression;
export const isIdentifier = (expression: Node): expression is Identifier => 'originalKeywordKind' in expression;
export const isBlock = (expression: Node): expression is Block => expression.kind === SyntaxKind.Block;

export const isPrivate = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.PrivateKeyword);
export const isPublic = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.PublicKeyword);
export const isStatic = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.StaticKeyword);
export const isProperty = (element: ClassElement): element is PropertyDeclaration => element.kind === SyntaxKind.PropertyDeclaration;
export const isMethod = (element: ClassElement): element is MethodDeclaration => {
  return [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ].indexOf(element.kind) !== -1;
};
export const isGetter = (element: ClassElement): element is GetAccessorDeclaration => element.kind === SyntaxKind.GetAccessor;
export const isSetter = (element: ClassElement): element is SetAccessorDeclaration => element.kind === SyntaxKind.SetAccessor;
export const isTransparent = (element: Node): boolean => transparentTypes.indexOf(element.kind) !== -1;

export const notPrivate = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.PrivateKeyword);
export const notPublic = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.PublicKeyword);
export const notStatic = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.StaticKeyword);
export const notProperty = (element: ClassElement): boolean => element.kind !== SyntaxKind.PropertyDeclaration;
export const notMethod = (element: ClassElement): boolean => {
  return [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ].indexOf(element.kind) === -1;
};
export const notGetter = (element: ClassElement): boolean => element.kind !== SyntaxKind.GetAccessor;
export const notSetter = (element: ClassElement): boolean => element.kind !== SyntaxKind.SetAccessor;
export const notTransparent = (element: Node): boolean => transparentTypes.indexOf(element.kind) === -1;

export const toString = (object: any): string => object.toString();
export const getText = (node: Node): string => node.getText();

export const wrapValue = (valueText: string): () => any => {
  const wrapper = new Function(`return ${valueText};`) as () => any;
  wrapper.toString = () => Function.prototype.toString.call(wrapper).replace('anonymous', '');
  return wrapper;
};
