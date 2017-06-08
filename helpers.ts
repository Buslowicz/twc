import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  BinaryExpression, Block, CallExpression, ClassDeclaration, ClassElement, Declaration, EnumDeclaration, ExportAssignment,
  ExportDeclaration, Expression, ExpressionStatement, forEachChild, FunctionDeclaration, FunctionExpression, GetAccessorDeclaration,
  HeritageClause, Identifier, ImportDeclaration, InterfaceDeclaration, MethodDeclaration, ModuleDeclaration, NamedImports, NamespaceImport,
  Node, PrefixUnaryExpression, PropertyDeclaration, SetAccessorDeclaration, SourceFile, SyntaxKind, TemplateExpression,
  TypeAliasDeclaration, VariableStatement
} from 'typescript';
import { ImportedNode, Method } from './builder';

export const transparentTypes = [
  SyntaxKind.AnyKeyword,
  SyntaxKind.VoidKeyword,
  SyntaxKind.NeverKeyword,
  SyntaxKind.NullKeyword,
  SyntaxKind.UndefinedKeyword
];

export const methodKinds = [ SyntaxKind.MethodDeclaration, SyntaxKind.Constructor ];

export class Link {
  constructor(public uri: string, private source: CallExpression) {}

  public toString() {
    return readFileSync(resolve(dirname(getRoot(this.source).fileName), this.uri)).toString();
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

export abstract class RefUpdater {
  protected refs?: Map<string, ImportedNode>;

  public provideRefs(variables: Map<string, ImportedNode>): this {
    this.refs = variables;
    return this;
  }

  protected getText = (statement: Node): string => {
    if (this.refs) {
      return updateImportedRefs(statement, this.refs);
    } else {
      return statement.getText();
    }
  }
}

export class InitializerWrapper extends RefUpdater {
  constructor(private declaration: Node) {
    super();
  }

  public valueOf() {
    return new Function(`return ${this.getText(this.declaration)};`)();
  }

  public toString() {
    return new Function(`return ${this.getText(this.declaration)};`).toString().replace('anonymous', '');
  }
}

export class ParsedDecorator {
  public get name(): string {
    return isCallExpression(this.declaration) ? this.declaration.expression.getText() : this.declaration.getText();
  }

  public get arguments() {
    if (!isCallExpression(this.declaration)) {
      return void 0;
    }
    return this.declaration.arguments.map((arg) => {
      switch (arg.kind) {
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.FunctionExpression:
          return new Method(arg as FunctionExpression, `_${this.variable.getText()}Computed`);
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
  }

  constructor(public readonly declaration: Identifier | CallExpression, private readonly variable: Identifier) {}

  public valueOf(): {name: string, arguments: Array<any>} {
    return { name: this.name, arguments: this.arguments };
  }
}

export const getDecorators = (declaration: ClassElement | ClassDeclaration): Array<ParsedDecorator> => {
  if (!declaration.decorators) {
    return [];
  }
  return declaration.decorators
    .map(({ expression }) => new ParsedDecorator(expression as any, declaration.name as Identifier));
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
export const hasDecorator = (declaration: ClassElement | ClassDeclaration, decoratorName: string): boolean => {
  if (!declaration.decorators) {
    return false;
  }
  return declaration.decorators.some(({ expression }) => {
    return (isExpressionStatement(expression) ? expression.expression : expression).getText() === decoratorName;
  });
};

export const isImportDeclaration = (st: Node): st is ImportDeclaration => st.kind === SyntaxKind.ImportDeclaration;
export const isInterfaceDeclaration = (st: Node): st is InterfaceDeclaration => st.kind === SyntaxKind.InterfaceDeclaration;
export const isClassDeclaration = (st: Node): st is ClassDeclaration => st.kind === SyntaxKind.ClassDeclaration;
export const isModuleDeclaration = (st: Node): st is ModuleDeclaration => st.kind === SyntaxKind.ModuleDeclaration;
export const isTypeAliasDeclaration = (st: Node): st is TypeAliasDeclaration => st.kind === SyntaxKind.TypeAliasDeclaration;
export const isVariableStatement = (st: Node): st is VariableStatement => st.kind === SyntaxKind.VariableStatement;
export const isFunctionDeclaration = (st: Node): st is FunctionDeclaration => st.kind === SyntaxKind.FunctionDeclaration;
export const isEnumDeclaration = (st: Node): st is EnumDeclaration => st.kind === SyntaxKind.EnumDeclaration;
export const isExportDeclaration = (st: Node): st is ExportDeclaration => st.kind === SyntaxKind.ExportDeclaration;
export const isExportAssignment = (st: Node): st is ExportAssignment => st.kind === SyntaxKind.ExportAssignment;

export const isTemplateExpression = (expr: Node): expr is TemplateExpression => expr.kind === SyntaxKind.TemplateExpression;
export const isNamespaceImport = (expr: Node): expr is NamespaceImport => expr.kind === SyntaxKind.NamespaceImport;
export const isNamedImports = (expr: Node): expr is NamedImports => expr.kind === SyntaxKind.NamedImports;
export const isBinaryExpression = (expr: Node): expr is BinaryExpression => 'operatorToken' in expr;
export const isExpressionStatement = (expr: Node): expr is ExpressionStatement => 'expression' in expr;
export const isPrefixUnaryExpression = (expr: Node): expr is PrefixUnaryExpression => 'operator' in expr;
export const isCallExpression = (expr: Node): expr is CallExpression => 'arguments' in expr;
export const isIdentifier = (expr: Node): expr is Identifier => 'originalKeywordKind' in expr;
export const isBlock = (expr: Node): expr is Block => expr.kind === SyntaxKind.Block;
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
export const toProperty = (key: string): (obj: any) => any => (obj: object) => obj[ key ];
export const stripQuotes = (str: string, char?: '`'|'"'|'\''): string => {
  if (str[0] === str[str.length - 1] && (char && str[0] === char || ['`', '"', '\''].includes(str[0]))) {
    return str.slice(1, -1);
  }
  return str;
};

export const reindent = (chunks: TemplateStringsArray | string, ...params: Array<string>): string => {
  const str = typeof chunks === 'string' ? chunks : chunks[ 0 ] + chunks.slice(1).map((chunk, i) => params[ i ] + chunk).join('');
  const tab = str.match(/^(\s*?\n)?([\t ]+)\S/);
  return tab ? str.replace(new RegExp(`^${tab[ 2 ]}`, 'gm'), '') : str;
};

export const indent = (tab: string): (chunks: TemplateStringsArray, ...params: Array<string>) => string => {
  return (chunks: TemplateStringsArray, ...params: Array<string>) => {
    const str = reindent(chunks[ 0 ] + chunks.slice(1).map((chunk, i) => params[ i ] + chunk).join(''));
    return str.replace(/^(.)/gm, `${tab}$1`);
  };
};

export const flattenChildren = (node: Node): Array<Node> => {
  const list = [ node ];
  forEachChild(node, (deep) => { list.push(...flattenChildren(deep)); });
  return list;
};

export const getRoot = (node: Node): SourceFile => {
  let root = node;
  while (node.parent) {
    root = node = node.parent;
  }
  return root as SourceFile;
};

export const updateImportedRefs = (src: Node, vars: Map<string, ImportedNode>): string => {
  return flattenChildren(src)
    .filter((node: Node) => node.constructor.name === 'IdentifierObject' && (node.parent as Declaration).name !== node)
    .filter((node) => vars.has(node.getText()))
    .sort((a, b) => b.pos - a.pos)
    .reduce((arr, identifier) => {
      const text = identifier.getText();
      return [
        ...arr.slice(0, identifier.pos - src.pos),
        ...identifier.getFullText().replace(text, vars.get(text).fullIdentifier),
        ...arr.slice(identifier.end - src.pos)
      ];
    }, src.getFullText().split(''))
    .join('');
};
