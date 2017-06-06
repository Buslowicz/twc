import { kebabCase } from 'lodash';
import { extname } from 'path';
import {
  ClassDeclaration, ClassElement, ExpressionStatement, FunctionExpression, ImportDeclaration, ImportSpecifier, InterfaceDeclaration, JSDoc,
  MethodDeclaration, ModuleKind, NamespaceImport, PropertyDeclaration, PropertySignature, Statement, SyntaxKind, TemplateExpression,
  transpileModule, TypeLiteralNode, TypeNode
} from 'typescript';
import {
  getDecorators, getText, hasModifier, InitializerWrapper, isBlock, isMethod, isNamedImports, isProperty, isStatic, Link, notPrivate,
  notStatic, ParsedDecorator, RefUpdater, updateImportedRefs
} from './helpers';
import { getTypeAndValue, parseDeclarationType, ValidValue } from './parsers';

export interface PolymerPropertyConfig {
  type: SyntaxKind;
  value?: ValidValue;
  readOnly?: boolean;
  reflectToAttribute?: boolean;
  notify?: boolean;
  computed?: string;
  observer?: string;
}

export interface PropertyObject {
  config: PolymerPropertyConfig | ValidValue;
  jsDoc?: string;
}

export interface ConfigExtras {
  methods: Array<Method>;
  properties: Array<Property>;
}

export const typeMap = {
  [SyntaxKind.StringKeyword]: String,
  [SyntaxKind.NumberKeyword]: Number,
  [SyntaxKind.BooleanKeyword]: Boolean,
  [SyntaxKind.ObjectKeyword]: Object,
  [SyntaxKind.ArrayType]: Array
};

export const decoratorsMap = {
  attr: (property: Property) => property.reflectToAttribute = true,
  compute: (property: Property, ref: string | Method, args: Array<string> = []) => {
    if (args.length === 0 && typeof ref !== 'string') {
      args = ref.argumentsNoType;
    }
    if (typeof ref === 'string') {
      property.computed = `"${ref}(${args.join(', ')})"`;
      return { methods: [] };
    } else {
      property.computed = `"${ref.name}(${args.join(', ')})"`;
      return { methods: [ ref ] };
    }
  },
  notify: (property: Property) => property.notify = true,
  observe: (method: Method, ...args): { properties?: Array<{ name: string, observer: string }>, observers?: Array<string> } => {
    if (args.length === 0) {
      args = method.argumentsNoType;
    }
    if (args.length === 1 && !args[ 0 ].includes('.')) {
      return { properties: [ { name: args[ 0 ], observer: `"${method.name}"` } ] };
    }
    return { observers: [ `${method.name}(${args.join(', ')})` ] };
  },
  style: (component: Component, ...styles: Array<string>) => component.styles = styles.map((style) => {
    if (style.endsWith('.css')) {
      return new Style(new Link(style));
    } else {
      return new Style(style, /^[\w\d]+(-[\w\d]+)+$/.test(style));
    }
  }),
  // todo: add remote template imports (solve cwd issue)
  template: (component: Component, template: string) => component.template = template.endsWith('.html') ? new Link(template) : template
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

  constructor(private bindings: ImportSpecifier | NamespaceImport, public importClause: Import) {}
}

export class Style {
  constructor(private style: string | Link, private isShared = false) {}

  public toHTML(): string {
    // todo: set baseURI
    let style = '';
    if (!this.isShared && typeof this.style === 'string') {
      style = this.style;
    } else if (this.style instanceof Link) {
      style = this.style.uri; // getContents('');
    }
    return `<style${this.isShared ? ` include="${this.style}"` : ''}>${style}</style>`;
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

  constructor(public declaration: ImportDeclaration) {
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

  constructor(private declaration: InterfaceDeclaration) {}

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

/* todo: make class properties to be getters from declaration source */
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

  constructor(private source: ClassDeclaration) {
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
          const tpl = statement.expression as TemplateExpression;
          return `${tpl.head.text}${
            tpl
              .templateSpans
              .map((span) => `{{${span.expression.getText().replace('this.', '')}}}${span.literal.text}`)
              .join('')
            }`;
        })
        .join('');

      this.methods.delete('template');
    }
  }

  private decorate(member: Property | Method | Component, decorators: Array<ParsedDecorator>): Property | Method | Component {
    decorators.forEach((decor) => {
      if (decor.name in decoratorsMap) {
        const { methods = [], properties = [], observers = [] } = decoratorsMap[ decor.name ](
          member,
          ...(decor.arguments || [])
        );
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

export namespace Targets {
  export function polymer1(statements: Array<Statement | Component | Import>, variables: Map<string, ImportedNode | any>) {
    const component = statements.find((statement) => statement instanceof Component) as Component;
    const statementIndex = statements.indexOf(component);

    variables = new Map<string, ImportedNode>(Array.from(variables).filter(([ k, v ]) => v instanceof ImportedNode));

    const printImports = () => statements
      .filter((statement) => statement instanceof Import)
      .filter((statement: Import) => statement.isImportable)
      .map((statement: Import) => statement.toHTML())
      .join('\n');

    const printProperties = () => component.properties.size > 0 ? `properties: {\n${
      Array.from(component.properties.values(), (prop) => `${prop.provideRefs(variables)}`).join(',\n')
      }\n}` : '';

    const printObservers = () => component.observers.length > 0 ? `observers: [\n${
      component.observers.map((observer) => `"${observer}"`).join(',\n')
      }\n]` : '';

    const printBehaviors = () => component.behaviors.length > 0 ? `behaviors: [\n${
      component.behaviors.map((behavior) => `"${behavior}"`).join(',\n')
      }\n]` : '';

    const printStatements = (from: number, to?: number): string => statements
      .slice(from, to)
      .filter((statement) => !(statement instanceof Import || statement instanceof Component))
      .map((statement: Statement) => updateImportedRefs(statement, variables).replace(/^(\s*)(export (default )?)/, '$1'))
      .join('\n');

    const printScript = () => `
      ${printStatements(0, statementIndex)}
      const ${component.name} = Polymer({\n${
      component.events.map((event) => `${event}`).join('\n')
      }${[
      `is: "${kebabCase(component.name)}"`,
      printProperties(),
      printObservers(),
      printBehaviors(),
      ...Array.from(component.methods.values()).map((method) => `${method.provideRefs(variables)}`)
    ].filter((chunk) => !!chunk).join(',\n')}
      });
      ${ Array.from(component.staticMethods.values()).map((method) => `${component.name}.${method.provideRefs(variables)};`).join('\n') }
      ${ Array.from(component.staticProperties.values()).map((prop) => `${component.name}.${prop.provideRefs(variables)};`).join('\n') }
      ${printStatements(statementIndex)}
    `;

    const printDomModule = () => `
      <dom-module is="${component.name}">
        <template>
          ${component.styles.map((style) => style.toHTML()).join('\n')}
          ${component.template}
        </template>
        <script>
          ${transpileModule(printScript(), { compilerOptions: { module: ModuleKind.ES2015 } }).outputText}
        </script>
      </dom-module>`;

    return `
      ${printImports()}${printDomModule()}
    `;
  }
}
