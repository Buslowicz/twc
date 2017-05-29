import {
  ClassDeclaration, ExpressionStatement, FunctionExpression, ImportDeclaration, ImportSpecifier, InterfaceDeclaration, JSDoc,
  MethodDeclaration, NamespaceImport, PropertyDeclaration, PropertySignature, SyntaxKind, TemplateExpression, TypeLiteralNode
} from 'typescript';
import {
  getDecorators, getText, hasModifier, isBlock, isMethod, isNamedImports, isProperty, isStatic, Link, notPrivate, notStatic, ParsedDecorator
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
    let type;
    if (style.endsWith('.css')) {
      return new Link(style);
    } else if (/^[\w\d]+(-[\w\d]+)+$/.test(style)) {
      type = 'shared';
    } else {
      type = 'inline';
    }
    return { style, type };
  }),
  // todo: add remote template imports (solve cwd issue)
  template: (component: Component, template: string) => component.template = template.endsWith('.html') ? new Link(template) : template
};

export class ImportedNode {
  public get identifier() {
    return this.bindings.name.getText();
  }

  public get fullIdentifier() {
    return this.bindings.name.getText();
  }

  constructor(private bindings: ImportSpecifier | NamespaceImport) {}
}

export class Import {
  public module: string;
  public imports: Array<ImportedNode> = [];

  constructor(public declaration: ImportDeclaration) {
    this.module = declaration.moduleSpecifier.getText();
    if (declaration.importClause) {
      const namedBindings = declaration.importClause.namedBindings;

      if (isNamedImports(namedBindings)) {
        this.imports = namedBindings.elements.map((binding) => new ImportedNode(binding));
      } else {
        this.imports = [ new ImportedNode(namedBindings) ];
      }
    }
  }
}

export class RegisteredEvent {
  public get name(): string {
    return this.declaration.name.getText();
  }

  public get description(): string {
    return this.declaration[ 'jsDoc' ].getText();
  }

  public get params(): Array<{ type: ValidValue, name: string, description?: string }> {
    const property = this.declaration.members.find((member) => member.name.getText() === 'detail') as PropertySignature;
    return (property.type as TypeLiteralNode).members.map((member) => ({
      description: member[ 'jsDoc' ] ? member[ 'jsDoc' ].getText() : null,
      name: member.name.getText(),
      type: parseDeclarationType(member as any)
    }));
  }

  constructor(private declaration: InterfaceDeclaration) {}
}

export class Property {
  public type: Constructor<ValidValue>;
  public value?: ValidValue;
  public readOnly?: boolean;
  public reflectToAttribute?: boolean;
  public notify?: boolean;
  public computed?: string;
  public observer?: string;
  public jsDoc?: Array<JSDoc>;
  public decorators: Array<ParsedDecorator>;

  constructor(public readonly declaration: PropertyDeclaration, public readonly name: string) {
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
    if (this.value) {
      return `value: ${typeof this.value === 'function' ? this.value.toString() : this.value}`;
    }
    return undefined;
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

export class Method {
  public decorators: Array<ParsedDecorator>;

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

  private statements: Array<string> = [];

  constructor(public readonly declaration: MethodDeclaration | FunctionExpression, public readonly name = 'function') {
    this.decorators = getDecorators(declaration as any);

    if (isBlock(declaration.body)) {
      this.statements = declaration.body.statements.map(getText);
    } else {
      this.statements = [ `return ${(declaration.body as MethodDeclaration).getText()};` ];
    }
  }

  public toString() {
    return `${this.name}(${this.arguments.join(', ')}) { ${this.statements.join('\n')} }`;
  }
}

export class Component {
  public name: string;
  public heritage: string;

  public template: string | Link;
  public styles: Array<{ type: 'shared' | 'inline', style: string } | Link> = [];
  public behaviors: Array<string> = [];
  public events: Array<RegisteredEvent> = [];

  public properties: Map<string, Property> = new Map();
  public methods: Map<string, Method> = new Map();
  public observers: Array<string> = [];
  public staticProperties: Map<string, Property> = new Map();
  public staticMethods: Map<string, Method> = new Map();

  private decorators: Array<ParsedDecorator>;

  constructor(private source: ClassDeclaration) {
    this.name = source.name.getText();

    this.heritage = source.heritageClauses ? source
      .heritageClauses
      .filter(({ token }) => token === SyntaxKind.ExtendsKeyword)
      .reduce((a, c) => c, null).getText().slice(8) : null;

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

    this.decorators = getDecorators(this.source);
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
