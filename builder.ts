import { existsSync } from 'fs';
import { kebabCase } from 'lodash';
import { dirname, extname, parse, resolve } from 'path';
import {
  ClassDeclaration, ClassElement, ExpressionStatement, FunctionExpression, ImportDeclaration, ImportSpecifier, InterfaceDeclaration, JSDoc,
  MethodDeclaration, ModuleBlock, ModuleDeclaration, NamespaceImport, Node, PropertyDeclaration, PropertySignature, SourceFile, Statement,
  SyntaxKind, TypeLiteralNode, TypeNode
} from 'typescript';

import * as decoratorsMap from './decorators';
import {
  getDecorators, getFlatHeritage, getRoot, getText, hasDecorator, hasModifier, inheritsFrom, InitializerWrapper, isBlock,
  isClassDeclaration, isExportAssignment, isExportDeclaration, isImportDeclaration, isInterfaceDeclaration, isMethod, isModuleDeclaration,
  isNamedImports, isProperty, isStatic, isTemplateExpression, Link, notPrivate, notStatic, ParsedDecorator, RefUpdater, stripQuotes
} from './helpers';
import { getTypeAndValue, parseDeclarationType, ValidValue } from './parsers';
import * as buildTargets from './targets';

export interface PolymerPropertyConfig {
  type: SyntaxKind;
  value?: ValidValue;
  readOnly?: boolean;
  reflectToAttribute?: boolean;
  notify?: boolean;
  computed?: string;
  observer?: string;
}

export const typeMap = {
  [SyntaxKind.StringKeyword]: String,
  [SyntaxKind.NumberKeyword]: Number,
  [SyntaxKind.BooleanKeyword]: Boolean,
  [SyntaxKind.ObjectKeyword]: Object,
  [SyntaxKind.ArrayType]: Array
};

export class ImportedNode {
  /** imported member */
  public get identifier() {
    return this.bindings.name.getText();
  }

  /** imported member with namespace */
  public get fullIdentifier() {
    return `${this.importClause.namespace ? `${this.importClause.namespace}.` : ''}${this.bindings.name.getText()}`;
  }

  constructor(private readonly bindings: ImportSpecifier | NamespaceImport, public readonly importClause: Import) {}
}

export class Style {
  constructor(private readonly style: string | Link, private readonly isShared = false) {}

  public toString(): string {
    let style = '';
    if (!this.isShared && typeof this.style === 'string') {
      style = this.style;
    } else if (this.style instanceof Link) {
      style = `${this.style}`;
    }
    return `<style${this.isShared ? ` include="${this.style}"` : ''}>${style.trim()}</style>`;
  }
}

export class Import {
  public module: string;
  public namespace: string;
  public imports: Array<ImportedNode> = [];

  public get isImportable() {
    const { module } = this;
    return [ '.js', '.html', '.css' ].includes(extname(module));
  }

  constructor(public readonly declaration: ImportDeclaration) {
    const { 1: module, 2: namespace = '' } = declaration.moduleSpecifier.getText().replace(/["']$|^["']/g, '').match(/([^#]+)(?:#(.+))?/);
    this.module = module;
    this.namespace = namespace;
    if (declaration.importClause) {
      const namedBindings = declaration.importClause.namedBindings;

      if (isNamedImports(namedBindings)) {
        this.imports = namedBindings.elements.map((binding) => new ImportedNode(binding, this));
      } else {
        this.imports = [ new ImportedNode(namedBindings, this) ];
      }
    }
  }

  public toHTML(): string {
    switch (extname(this.module)) {
      case '.html':
        return `<link rel="import" href="${this.module}">`;
      case '.js':
        return `<script src="${this.module}"></script>`;
      case '.css':
        return `<link rel="stylesheet" href="${this.module}">`;
      default:
        return `<link rel="import" href="${this.module}">`;
    }
  }
}

export class RegisteredEvent {
  public get name(): string {
    return this.declaration.name.getText();
  }

  public get description(): string {
    const jsDoc = this.declaration[ 'jsDoc' ];
    return jsDoc ? jsDoc.map((doc) => doc.comment).join('\n') : null;
  }

  public get params(): Array<{ type: ValidValue, rawType: TypeNode, name: string, description?: string }> {
    const property = this.declaration.members.find((member) => member.name.getText() === 'detail') as PropertySignature;
    return (property.type as TypeLiteralNode).members.map((member) => ({
      description: member[ 'jsDoc' ] ? member[ 'jsDoc' ].map((doc) => doc.comment).join('\n') : null,
      name: member.name.getText(),
      rawType: member[ 'type' ],
      type: parseDeclarationType(member as any)
    }));
  }

  constructor(private readonly declaration: InterfaceDeclaration) {}

  public toString() {
    return [
      '/**',
      ...(this.description ? [
        ` * ${this.description}`,
        ` *`
      ] : []),
      ` * @event ${kebabCase(this.name)}`,
      ...this.params.map(({ rawType, name, description }) => {
        const type = rawType.getText().replace(/\s+/g, ' ').replace(/(.+?:.+?);/g, '$1,');
        return ` * @param {${type}} ${name}${description ? ` ${description}` : ''}`;
      }),
      ' */\n'
    ].join('\n');
  }
}

export class Property extends RefUpdater {
  public type: Constructor<ValidValue>;
  public value?: ValidValue | InitializerWrapper;
  public readOnly?: boolean;
  public reflectToAttribute?: boolean;
  public notify?: boolean;
  public computed?: string;
  public observer?: string;
  public jsDoc?: Array<JSDoc>;
  public decorators: Array<ParsedDecorator>;

  constructor(public readonly declaration: PropertyDeclaration, public readonly name: string) {
    super();
    const { type, value, isDate } = getTypeAndValue(declaration);
    this.readOnly = hasModifier(declaration, SyntaxKind.ReadonlyKeyword);
    this.decorators = getDecorators(declaration);

    Object.assign(this, {
      jsDoc: declaration[ 'jsDoc' ] as Array<JSDoc>,
      type: isDate ? Date : typeMap[ type || SyntaxKind.ObjectKeyword ],
      value
    });
  }

  public toString() {
    if (this.value instanceof InitializerWrapper) {
      (this.value as InitializerWrapper).provideRefs(this.refs);
    }
    if (isStatic(this.declaration)) {
      return `${this.getJsDoc()}${this.name} = ${this.value}`;
    }
    return `${this.getJsDoc()}${this.name}: ${
      this.isSimpleConfig() ? this.type.name : `{ ${
        [
          this.getType(),
          this.getValue(),
          this.getReadOnly(),
          this.getReflectToAttribute(),
          this.getNotify(),
          this.getComputed(),
          this.getObserver()
        ]
          .filter((key) => !!key)
          .join(', ')} }`
      }`;
  }

  private getType() {
    return `type: ${this.type.name}`;
  }

  private getValue() {
    return this.value ? `value: ${this.value}` : undefined;
  }

  private getReadOnly() {
    return this.readOnly ? 'readOnly: true' : undefined;
  }

  private getReflectToAttribute() {
    return this.reflectToAttribute ? 'reflectToAttribute: true' : undefined;
  }

  private getNotify() {
    return this.notify ? 'notify: true' : undefined;
  }

  private getComputed() {
    return this.computed ? `computed: ${this.computed}` : undefined;
  }

  private getObserver() {
    return this.observer ? `observer: ${this.observer}` : undefined;
  }

  private getJsDoc() {
    return this.jsDoc ? `${this.jsDoc.map((doc) => doc.getText()).join('\n')}\n` : '';
  }

  private isSimpleConfig(): boolean {
    return this.type
      && this.value === undefined
      && !this.readOnly
      && !this.reflectToAttribute
      && !this.notify
      && !this.computed
      && !this.observer;
  }
}

export class Method extends RefUpdater {
  public get decorators(): Array<ParsedDecorator> {
    return getDecorators(this.declaration as any);
  }

  public get arguments(): Array<string> {
    if (!this.declaration.parameters) {
      return [];
    }
    return this.declaration.parameters.map(getText);
  }

  public get argumentsNoType(): Array<string> {
    if (!this.declaration.parameters) {
      return [];
    }
    return this.declaration.parameters.map((param) => param.name.getText());
  }

  private get statements(): Array<string> {
    if (isBlock(this.declaration.body)) {
      return this.declaration.body.statements.map(this.getText);
    } else {
      return [ `return ${this.getText(this.declaration.body as MethodDeclaration)};` ];
    }
  }

  constructor(public readonly declaration: MethodDeclaration | FunctionExpression, public readonly name = 'function') {
    super();
  }

  public toString() {
    const name = isStatic(this.declaration as ClassElement) ? `${this.name} = function` : this.name;
    return `${name}(${this.arguments.join(', ')}) { ${this.statements.join('\n')} }`;
  }
}

export class Component {
  public get name(): string {
    return this.source.name.getText();
  }

  public get heritage(): string {
    if (!this.source.heritageClauses) {
      return null;
    }
    return this.source.heritageClauses
      .filter(({ token }) => token === SyntaxKind.ExtendsKeyword)
      .reduce((a, c) => c, null).getText().slice(8);
  }

  public template: string | Link;
  public styles: Array<Style> = [];
  public behaviors: Array<string> = [];
  public events: Array<RegisteredEvent> = [];

  public properties: Map<string, Property> = new Map();
  public methods: Map<string, Method> = new Map();
  public observers: Array<string> = [];
  public staticProperties: Map<string, Property> = new Map();
  public staticMethods: Map<string, Method> = new Map();

  public get decorators(): Array<ParsedDecorator> {
    return getDecorators(this.source);
  }

  constructor(private readonly source: ClassDeclaration) {
    this.source
      .members
      .filter(isProperty)
      .filter(notPrivate)
      .filter(notStatic)
      .map((property: PropertyDeclaration) => new Property(property, property.name.getText()))
      .map((property) => this.decorate(property, property.decorators))
      .forEach((property: Property) => this.properties.set(property.name, property));

    this.source
      .members
      .filter(isProperty)
      .filter(isStatic)
      .map((property: PropertyDeclaration) => new Property(property, property.name.getText()))
      .forEach((property: Property) => this.staticProperties.set(property.name, property));

    this.source
      .members
      .filter(isMethod)
      .filter(notStatic)
      .map((method: MethodDeclaration) => new Method(method, method.name ? method.name.getText() : 'constructor'))
      .map((method) => this.decorate(method, method.decorators))
      .forEach((method: Method) => this.methods.set(method.name, method));

    this.source
      .members
      .filter(isMethod)
      .filter(isStatic)
      .map((method: MethodDeclaration) => new Method(method, method.name ? method.name.getText() : 'constructor'))
      .forEach((method: Method) => this.staticMethods.set(method.name, method));

    this.decorate(this, this.decorators);

    if (this.methods.has('template')) {
      // todo: improve and test
      this.template = this.methods.get('template')
        .declaration.body.statements
        .map((statement: ExpressionStatement) => {
          const tpl = statement.expression;
          if (isTemplateExpression(tpl)) {
            return `${tpl.head.text}${
              tpl
                .templateSpans
                .map((span) => `{{${span.expression.getText().replace('this.', '')}}}${span.literal.text}`)
                .join('')
              }`;
          } else {
            return stripQuotes(tpl.getText());
          }
        })
        .join('');

      this.methods.delete('template');
    }

    const fileName = getRoot(this.source).fileName;
    const implicitTemplateName = `${parse(fileName).name}.html`;
    if (!this.template && existsSync(resolve(dirname(fileName), implicitTemplateName))) {
      this.template = new Link(implicitTemplateName, source as Node);
    }
  }

  private decorate(member: Property | Method | Component, decorators: Array<ParsedDecorator>): Property | Method | Component {
    decorators.forEach((decor) => {
      if (decor.name in decoratorsMap) {
        const { methods = [], properties = [], observers = [] } = decoratorsMap[ decor.name ].call(
          decor,
          member,
          ...(decor.arguments || [])
        ) || {};
        properties.forEach((property) => {
          if (this.properties.has(property.name)) {
            Object.assign(this.properties.get(property.name), property);
          } else {
            this.properties.set(property.name, property);
          }
        });
        methods.forEach((method) => {
          if (this.methods.has(method.name)) {
            Object.assign(this.methods.get(method.name), method);
          } else {
            this.methods.set(method.name, method);
          }
        });
        observers.forEach((observer) => this.observers.push(observer));
      }
    });
    return member;
  }
}

export class Module {
  public get name() {
    return isModuleDeclaration(this.source) ? this.source.name.getText() : '';
  }

  public get imports(): Array<Import> {
    return this.statements
      .filter((statement) => statement instanceof Import)
      .filter((statement: Import) => statement.isImportable) as Array<Import>;
  }

  public get components(): Array<Component> {
    return Array
      .from(this.variables.values())
      .filter((variable) => variable instanceof Component);
  }

  public get events(): Array<RegisteredEvent> {
    return Array
      .from(this.variables.values())
      .filter((variable) => variable instanceof RegisteredEvent);
  }

  public readonly statements: Array<Statement | Component | Import | Module> = [];
  public readonly variables: Map<string, ImportedNode | any> = new Map();

  constructor(private readonly source: SourceFile | ModuleDeclaration,
              private readonly output: 'polymer1' | 'polymer2',
              public readonly parent: Module = null) {
    (isModuleDeclaration(source) ? source.body as ModuleBlock : source).statements.forEach((statement) => {
      if (isImportDeclaration(statement)) {
        const declaration = new Import(statement);
        declaration.imports.forEach((imp) => this.variables.set(imp.identifier, imp));
        this.statements.push(declaration);
        return;
      } else if (isInterfaceDeclaration(statement)) {
        const name = statement.name.getText();
        if (this.variables.has(name) && this.variables.get(name) instanceof Component) {
          this.variables.get(name).behaviors.push(...getFlatHeritage(statement));
        } else if (inheritsFrom(statement, 'CustomEvent', 'Event')) {
          this.variables.set(name, new RegisteredEvent(statement));
        } else {
          this.variables.set(name, statement);
        }
      } else if (isClassDeclaration(statement) && hasDecorator(statement, 'CustomElement')) {
        const component = new Component(statement as ClassDeclaration);

        if (this.variables.has(component.name) && !(this.variables.get(component.name) instanceof Component)) {
          component.behaviors.push(...getFlatHeritage(this.variables.get(component.name)));
        }

        this.variables.set(component.name, component);
        this.statements.push(component);
        return;
      } else if (isModuleDeclaration(statement)) {
        const module = new Module(statement, this.output, this);
        this.variables.set(module.name, module);
        this.statements.push(module);
        return;
      } else if (isExportDeclaration(statement) || isExportAssignment(statement)) {
        return;
      }
      this.statements.push(statement);
    });

    this.components.forEach((component) => component.events.push(...this.events));
  }

  public toString() {
    return buildTargets[ this.output ].call(this);
  }
}
