import {
  BinaryExpression, Block, CallExpression, ClassElement, FunctionExpression,
  GetAccessorDeclaration,
  Identifier,
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

export const isBinaryExpression = (expression): expression is BinaryExpression => 'operatorToken' in expression;
export const isPrefixUnaryExpression = (expression): expression is PrefixUnaryExpression => 'operator' in expression;
export const isCallExpression = (expression): expression is CallExpression => 'arguments' in expression;
export const isIdentifier = (expression): expression is Identifier => 'originalKeywordKind' in expression;
export const isBlock = (expression): expression is Block => expression.kind === SyntaxKind.Block;

export const hasModifier = ({ modifiers }: ClassElement, mod: SyntaxKind): boolean => {
  return modifiers ? modifiers.some(({ kind }) => kind === mod) : false;
};
export const hasDecorator = (declaration: ClassElement | Array<ParsedDecorator>, decoratorName: string): boolean => {
  if (Array.isArray(declaration)) {
    return declaration.some(({ name }) => name === decoratorName);
  } else if (declaration.decorators) {
    return declaration.decorators.some(({ expression }) => {
      return ('expression' in expression ? expression[ 'expression' ] : expression).getText() === decoratorName;
    });
  }
  return false;
};

export const getDecorators = (declaration: ClassElement): Array<ParsedDecorator> => {
  if (declaration.decorators) {
    return declaration.decorators.map(({ expression }) => {
      if (isCallExpression(expression)) {
        const name = expression.expression.getText();
        return {
          arguments: expression.arguments.map((arg) => {
            switch (arg.kind) {
              case SyntaxKind.ArrowFunction:
              case SyntaxKind.FunctionExpression:
                return new Method(arg as FunctionExpression, `_${declaration.name.getText()}Computed`);
              default:
                return new Function(`return ${arg.getText()}`)();
            }
          }),
          name
        };
      } else {
        return {
          name: expression.getText()
        };
      }
    });
  }
  return [];
};

export const isPrivate = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.PrivateKeyword);
export const notPrivate = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.PrivateKeyword);
export const isPublic = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.PublicKeyword);
export const notPublic = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.PublicKeyword);
export const isStatic = (element: ClassElement): boolean => hasModifier(element, SyntaxKind.StaticKeyword);
export const notStatic = (element: ClassElement): boolean => !hasModifier(element, SyntaxKind.StaticKeyword);
export const isProperty = (element: ClassElement): element is PropertyDeclaration => {
  return element.kind === SyntaxKind.PropertyDeclaration;
};
export const notProperty = (element: ClassElement): boolean => {
  return element.kind !== SyntaxKind.PropertyDeclaration;
};
export const isMethod = (element: ClassElement): element is MethodDeclaration => {
  return [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ].indexOf(element.kind) !== -1;
};
export const notMethod = (element: ClassElement): boolean => {
  return [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ].indexOf(element.kind) === -1;
};
export const isGetter = (element: ClassElement): element is GetAccessorDeclaration => {
  return element.kind === SyntaxKind.GetAccessor;
};
export const notGetter = (element: ClassElement): boolean => {
  return element.kind !== SyntaxKind.GetAccessor;
};
export const isSetter = (element: ClassElement): element is SetAccessorDeclaration => {
  return element.kind === SyntaxKind.SetAccessor;
};
export const notSetter = (element: ClassElement): boolean => {
  return element.kind !== SyntaxKind.SetAccessor;
};
export const isTransparent = ({ kind }: Node): boolean => transparentTypes.indexOf(kind) !== -1;
export const notTransparent = ({ kind }: Node): boolean => transparentTypes.indexOf(kind) === -1;
export const wrapValue = (valueText: string): () => any => {
  const wrapper = new Function(`return ${valueText};`) as () => any;
  wrapper.toString = () => Function.prototype.toString.call(wrapper).replace('anonymous', '');
  return wrapper;
};
