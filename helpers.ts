import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  BinaryExpression, Block, CallExpression, ClassDeclaration, ClassElement, EnumDeclaration, Expression, ExpressionStatement,
  FunctionDeclaration, FunctionExpression, GetAccessorDeclaration, HeritageClause, Identifier, ImportDeclaration, InterfaceDeclaration,
  MethodDeclaration, ModuleDeclaration, NamedImports, NamespaceImport, Node, PrefixUnaryExpression, PropertyDeclaration,
  SetAccessorDeclaration, Statement, SyntaxKind, TypeAliasDeclaration, VariableStatement
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

export const methodKinds = [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ];

export class Link {
  constructor(public uri: string) {}

  public getContents(base: string) {
    return readFileSync(resolve(base, this.uri)).toString();
  }
}

export class Ref {
  constructor(public ref: Identifier) {}

  public getReference(statements: Map<string, any>) {
    return statements.get(this.ref.getText());
  }

  public toString() {
    return this.ref.getText();
  }
}

export class ReferencedExpression {
  constructor(public expr: Expression) {}

  public toString() {
    return this.expr.getText();
  }
}

export const getDecorators = (declaration: ClassElement | ClassDeclaration): Array<ParsedDecorator> => {
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
          case SyntaxKind.Identifier:
            return new Ref(arg as Identifier);
          default:
            try {
              return new Function(`return ${arg.getText()}`)();
            } catch (err) {
              return new ReferencedExpression(arg);
            }
        }
      });
      return { arguments: args, name };
    }
    return { name: expression.getText() };
  });
};

export const flatExtends = (expression: Node) => {
  if (isCallExpression(expression)) {
    return [ expression.expression.getText(), ...expression.arguments.map((arg) => flatExtends(arg)) ].reduce((p, c) => p.concat(c), []);
  } else {
    return [ expression.getText() ];
  }
};

export const getFlatHeritage = (declaration: ClassDeclaration | InterfaceDeclaration) => {
  if (!declaration.heritageClauses) {
    return [];
  }

  return declaration
    .heritageClauses
    .filter(isExtendsDeclaration)
    .map(toProperty('types'))
    .reduce(flattenArray, [])
    .map(toProperty('expression'))
    .map(flatExtends)
    .reduce(flattenArray, []);
};

export const inheritsFrom = (declaration: ClassDeclaration | InterfaceDeclaration, ...names: Array<string>) => {
  if (!declaration.heritageClauses) {
    return false;
  }

  const types = getFlatHeritage(declaration);

  return names.some((name) => types.includes(name));
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

export const isImportDeclaration = (st: Statement): st is ImportDeclaration => st.kind === SyntaxKind.ImportDeclaration;
export const isInterfaceDeclaration = (st: Statement): st is InterfaceDeclaration => st.kind === SyntaxKind.InterfaceDeclaration;
export const isClassDeclaration = (st: Statement): st is ClassDeclaration => st.kind === SyntaxKind.ClassDeclaration;
export const isModuleDeclaration = (st: Statement): st is ModuleDeclaration => st.kind === SyntaxKind.ModuleDeclaration;
export const isTypeAliasDeclaration = (st: Statement): st is TypeAliasDeclaration => st.kind === SyntaxKind.TypeAliasDeclaration;
export const isVariableStatement = (st: Statement): st is VariableStatement => st.kind === SyntaxKind.VariableStatement;
export const isFunctionDeclaration = (st: Statement): st is FunctionDeclaration => st.kind === SyntaxKind.FunctionDeclaration;
export const isEnumDeclaration = (st: Statement): st is EnumDeclaration => st.kind === SyntaxKind.EnumDeclaration;

export const isNamespaceImport = (expression: Node): expression is NamespaceImport => expression.kind === SyntaxKind.NamespaceImport;
export const isNamedImports = (expression: Node): expression is NamedImports => expression.kind === SyntaxKind.NamedImports;
export const isBinaryExpression = (expression: Node): expression is BinaryExpression => 'operatorToken' in expression;
export const isExpressionStatement = (expression: Node): expression is ExpressionStatement => 'expression' in expression;
export const isPrefixUnaryExpression = (expression: Node): expression is PrefixUnaryExpression => 'operator' in expression;
export const isCallExpression = (expression: Node): expression is CallExpression => 'arguments' in expression;
export const isIdentifier = (expression: Node): expression is Identifier => 'originalKeywordKind' in expression;
export const isBlock = (expression: Node): expression is Block => expression.kind === SyntaxKind.Block;
export const isExtendsDeclaration = (heritage: HeritageClause): boolean => heritage.token === SyntaxKind.ExtendsKeyword;

export const isPrivate = (el: ClassElement): boolean => hasModifier(el, SyntaxKind.PrivateKeyword);
export const isPublic = (el: ClassElement): boolean => hasModifier(el, SyntaxKind.PublicKeyword);
export const isStatic = (el: ClassElement): boolean => hasModifier(el, SyntaxKind.StaticKeyword);
export const isProperty = (el: ClassElement): el is PropertyDeclaration => el.kind === SyntaxKind.PropertyDeclaration;
export const isMethod = (el: ClassElement): el is MethodDeclaration => methodKinds.includes(el.kind);
export const isGetter = (el: ClassElement): el is GetAccessorDeclaration => el.kind === SyntaxKind.GetAccessor;
export const isSetter = (el: ClassElement): el is SetAccessorDeclaration => el.kind === SyntaxKind.SetAccessor;
export const isTransparent = (el: Node): boolean => transparentTypes.includes(el.kind);

export const notPrivate = (el: ClassElement): boolean => !hasModifier(el, SyntaxKind.PrivateKeyword);
export const notPublic = (el: ClassElement): boolean => !hasModifier(el, SyntaxKind.PublicKeyword);
export const notStatic = (el: ClassElement): boolean => !hasModifier(el, SyntaxKind.StaticKeyword);
export const notProperty = (el: ClassElement): boolean => el.kind !== SyntaxKind.PropertyDeclaration;
export const notMethod = (el: ClassElement): boolean => !methodKinds.includes(el.kind);
export const notGetter = (el: ClassElement): boolean => el.kind !== SyntaxKind.GetAccessor;
export const notSetter = (el: ClassElement): boolean => el.kind !== SyntaxKind.SetAccessor;
export const notTransparent = (el: Node): boolean => !transparentTypes.includes(el.kind);

export const toString = (object: any): string => object.toString();
export const getText = (node: Node): string => node.getText();
export const flattenArray = (p: Array<any>, c: any): Array<any> => p.concat(c);
export const toProperty = (key: string) => (obj: object) => obj[ key ];

export const wrapValue = (valueText: string): () => any => {
  const wrapper = new Function(`return ${valueText};`) as () => any;
  wrapper.toString = () => Function.prototype.toString.call(wrapper).replace('anonymous', '');
  return wrapper;
};
