import { existsSync } from "fs";
import { dirname, extname, join, normalize, parse, relative, resolve } from "path";
import { CustomElementOptions } from "twc/polymer";
import {
  ArrayLiteralExpression, BinaryExpression, CallExpression, ClassDeclaration, CompilerOptions, createBlock, createFunctionDeclaration,
  Expression, ExpressionStatement, forEachChild, FunctionLikeDeclaration, HeritageClause, Identifier, ImportDeclaration, ImportSpecifier,
  InterfaceDeclaration, isBinaryExpression, isBlock, isCallExpression, isClassDeclaration, isConditionalExpression, isExportAssignment,
  isExportDeclaration, isFunctionLike, isGetAccessorDeclaration, isImportDeclaration, isInterfaceDeclaration, isModuleDeclaration,
  isNamedImports, isPropertyAccessExpression, isPropertyDeclaration, isSetAccessorDeclaration, isTemplateExpression, MethodDeclaration,
  ModuleBlock, ModuleDeclaration, NamespaceImport, Node, NoSubstitutionTemplateLiteral, PropertyAccessExpression, PropertyDeclaration,
  PropertySignature, SourceFile, Statement, StringLiteral, SyntaxKind, TemplateExpression, TypeLiteralNode, TypeNode
} from "typescript";
import { cache, paths, projectRoot } from "./config";
import * as decoratorsMap from "./decorators";
import { DecoratorExtras } from "./decorators";
import {
  DecoratorsMixin, getRoot, hasDecorator, hasModifier, inheritsFrom, InitializerWrapper, isExtendsDeclaration, isOneOf, isStatic,
  JSDocMixin, Link, notPrivate, notStatic, outPath, ParsedDecorator, RefUpdaterMixin, stripQuotes
} from "./helpers";
import * as buildTargets from "./targets";
import { parseDeclaration, parseDeclarationType, ValidValue } from "./type-analyzer";

/**
 * Method hook interface
 */
export interface MethodHook {
  place: "beforeend" | "afterbegin";
  statement: string;
}

/**
 * Map of TypeScript kind to JavaScript type.
 */
export const typeMap = {
  [SyntaxKind.StringKeyword]: String,
  [SyntaxKind.NumberKeyword]: Number,
  [SyntaxKind.BooleanKeyword]: Boolean,
  [SyntaxKind.ObjectKeyword]: Object,
  [SyntaxKind.ArrayType]: Array
};

/**
 * Representation of an imported entity. Provides an imported identifier and fullIdentifier (identifier with namespace if provided).
 */
export class ImportedNode {
  /** Imported entity name */
  public get identifier() {
    return this.bindings.name.getText();
  }

  constructor(public readonly bindings: ImportSpecifier | NamespaceImport, public readonly importClause: Import) {}

  /** Imported entity name with namespace */
  public get fullIdentifier() {
    const cachedModule = cache.modules.get(this.importClause.module);
    const cachedBindings = cachedModule ? cachedModule.get(this.bindings.name.getText()) : null;
    return `${cachedBindings && cachedBindings.namespace ? `${cachedBindings.namespace}.` : ""}${this.bindings.name.getText()}`;
  }
}

/**
 * Representation of an import. Provides a list of ImportedNode's, module path and a namespace.
 * When converted to a string, it returns an HTML Import for HTML files, script tak for JS files and link for CSS files.
 */
export class Import {
  /** Module path */
  public module: string;
  /** List of imported entities */
  public imports: Array<ImportedNode> = [];

  /** Checks if module is importable (module path ends with .js, .html or .css) */
  public get isImportable() {
    return [ ".js", ".html", ".css" ].includes(extname(this.module));
  }

  /** Calculate path from file to project root */
  private get rootPath() {
    return relative(dirname(outPath(getRoot(this.declaration).fileName)), projectRoot);
  }

  constructor(public readonly declaration: ImportDeclaration) {
    const { 1: module } = declaration.moduleSpecifier.getText().replace(/["']$|^["']/g, "").match(/([^#]+)(?:#(.+))?/);

    this.module = module;
    if (declaration.importClause) {
      const namedBindings = declaration.importClause.namedBindings;

      if (isNamedImports(namedBindings)) {
        this.imports = namedBindings.elements.map((binding) => new ImportedNode(binding, this));
      } else {
        this.imports = [ new ImportedNode(namedBindings, this) ];
      }
    }
  }

  public toString(): string {
    switch (extname(this.module)) {
      case ".js":
        return `<script src="${this.resolveModule()}"></script>`;
      case ".css":
        return `<link rel="stylesheet" href="${this.resolveModule()}">`;
      default:
        return `<link rel="import" href="${this.resolveModule()}">`;
    }
  }

  /**
   * Resolve absolute module paths based on repo name, outDir and rootDir
   *
   * @returns Resolved module/component path
   */
  private resolveModule() {
    const [ , repo = "", path = this.module ] = this.module.match(/(?:([a-z]+):)?(.*)/) || [];
    let modulePath = path;
    if (repo in paths) {
      modulePath = join(paths[ repo ], path);
    } else if (repo) {
      modulePath = join(repo, path);
    } else if (path.startsWith("~")) {
      modulePath = path.substr(1);
    } else {
      return path;
    }
    return normalize(join(this.rootPath, modulePath));
  }
}

/**
 * Representation of a style, which can be css, link to css file or a shared component.
 * When converted to a string, it returns a style tag with provided css or include clause for shared styles.
 */
export class Style {
  constructor(public readonly style: string | Link, public readonly isShared = false) {
  }

  public toString(): string {
    let style = `${this.style}`;
    if (this.isShared) {
      style = "";
    }
    return `<style${this.isShared ? ` include="${this.style}"` : ""}>${style.trim()}</style>`;
  }
}

/**
 * Representation of a template with all the necessary logic
 */
export class Template {
  /**
   * Create a template from method returning a string
   *
   * @param fun Method to use as a declaration source
   *
   * @returns New template
   */
  public static fromMethod(fun: MethodDeclaration): Template {
    return new Template((fun.body.statements.reduce((p, c) => c) as ExpressionStatement).expression as TemplateExpression);
  }

  /**
   * Create a template from a link
   *
   * @param link Link to use to fetch the source
   *
   * @returns New template
   */
  public static fromLink(link: Link): Template {
    return Object.assign(new Template(null), { link });
  }

  /**
   * Create a template from a string
   *
   * @param src String source to use as a template
   *
   * @returns New template
   */
  public static fromString(src: string): Template {
    return Object.assign(new Template(null), { src });
  }

  public methods: Map<string, Method> = new Map();
  private link: Link;
  private src: string;

  constructor(public declaration?: StringLiteral | TemplateExpression | NoSubstitutionTemplateLiteral) {
    if (!this.declaration || !isTemplateExpression(this.declaration)) {
      return;
    }
    this.methods = new Map(
      this.declaration.templateSpans
        .filter(({ expression }) => isBinaryExpression(expression) || isConditionalExpression(expression))
        .map(({ expression }, i): [ string, Method ] => {
          const args = [];
          forEachChild(expression, (node) => {
            if (isPropertyAccessExpression(node) && node.expression.kind === SyntaxKind.ThisKeyword) {
              args.push(node.name);
            }
          });
          const method = new Method(expression as BinaryExpression, `_expr${i}`, args);
          return [ expression.getText(), method ];
        })
    );
  }

  /**
   * Parse an expression to a valid template binding
   *
   * @param expr Expression to parse
   * @param binding Binding used around the variable
   *
   * @returns Template binding as a string
   */
  public parseExpression(expr: Expression, binding: [ string, string ]): string {
    const hasBinding = [ "{{", "[[" ].includes(binding[ 0 ]) && [ "}}", "]]" ].includes(binding[ 1 ]);
    const bindOneWay = (entity) => hasBinding ? entity : `[[${entity}]]`;
    const bindTwoWay = (entity) => hasBinding ? entity : `{{${entity}}}`;
    if (isPropertyAccessExpression(expr) && expr.expression.kind === SyntaxKind.ThisKeyword) {
      return bindTwoWay(expr.name.text);
    } else {
      const expressionText = expr.getText();
      const method = this.methods.get(expressionText);
      return method ? bindOneWay(`${method.name}(${method.arguments.join(", ")})`) : bindTwoWay(expressionText);
    }
  }

  public toString() {
    if (this.declaration) {
      if (isTemplateExpression(this.declaration)) {
        return this.declaration.templateSpans.reduce((tpl, span) => {
          return tpl + this.parseExpression(span.expression, [ tpl.slice(-2), span.literal.text.slice(0, 2) ]) + span.literal.text;
        }, this.declaration.head.text);
      }
      return stripQuotes(this.declaration.getText());
    } else if (this.link) {
      return this.link.toString();
    }
    return this.src || "";
  }
}

/**
 * Representation of a custom event interface declaration.
 */
export class RegisteredEvent {
  /** Name of an event */
  public get name(): string {
    return this.declaration.name.getText();
  }

  /** Event description */
  public get description(): string {
    const jsDoc = this.declaration[ "jsDoc" ];
    return jsDoc ? jsDoc.map((doc) => doc.comment).join("\n") : null;
  }

  /** List of detail members (keys in an event detail) */
  public get params(): Array<{ type: ValidValue, rawType: TypeNode, name: string, description?: string }> {
    const property = this.declaration.members.find((member) => member.name.getText() === "detail") as PropertySignature;
    if (!property) {
      return [];
    }
    return (property.type as TypeLiteralNode).members.map((member) => ({
      description: member[ "jsDoc" ] ? member[ "jsDoc" ].map((doc) => doc.comment).join("\n") : null,
      name: member.name.getText(),
      rawType: member[ "type" ],
      type: parseDeclarationType(member as any)
    }));
  }

  constructor(public readonly declaration: InterfaceDeclaration) {
  }

  public toString() {
    return [
      "/**",
      ...(this.description ? [
        ` * ${this.description}`,
        ` *`
      ] : []),
      ` * @event ${this.name.replace(/([A-Z])/g, (_, l, i) => (i ? "-" : "") + l.toLowerCase())}`,
      ...this.params.map(({ rawType, name, description }) => {
        const type = rawType.getText().replace(/\s+/g, " ").replace(/(.+?:.+?);/g, "$1,");
        return ` * @param {${type}} ${name}${description ? ` ${description}` : ""}`;
      }),
      " */\n"
    ].join("\n");
  }
}

/**
 * Representation of a component property.
 * When converted to a string, it returns an object with a property config or a type if only type is available.
 */
export class Property extends RefUpdaterMixin(JSDocMixin(DecoratorsMixin())) {
  /** Type of a property */
  public type: Constructor<ValidValue>;
  /** Default value */
  public value?: ValidValue | InitializerWrapper;
  /** Whether property reflects to an attribute */
  public reflectToAttribute?: boolean;
  /** Whether to send an event whenever property changes */
  public notify?: boolean;
  /** Computed property resolver */
  public computed?: string;
  /** Property observer */
  public observer?: string;

  /** Whether property has a read only access */
  public set readOnly(readOnly) {
    this[ " isReadOnly" ] = readOnly;
  }

  public get readOnly(): boolean {
    return " isReadOnly" in this ? this[ " isReadOnly" ] : hasModifier(this.declaration, SyntaxKind.ReadonlyKeyword);
  }

  constructor(public readonly declaration: PropertyDeclaration, public readonly name: string) {
    super();
    const { type, value, isDate } = parseDeclaration(declaration);

    Object.assign(this, { type: isDate ? Date : typeMap[ type || SyntaxKind.ObjectKeyword ], value });
  }

  public toString() {
    if (this.value instanceof InitializerWrapper) {
      (this.value as InitializerWrapper).provideRefs(this.refs);
    }
    if (isStatic(this.declaration)) {
      return `${this.value}`;
    }
    const props = [ "readOnly", "reflectToAttribute", "notify", "computed", "observer" ];

    const isSimpleConfig = this.type && this.value === undefined && props.every((prop) => !this[ prop ]);

    return isSimpleConfig ? this.type.name : `{ ${ [
      `type: ${this.type.name}`,
      ...(this.value === undefined ? [] : [ `value: ${this.value}` ]),
      ...props.map((prop) => this[ prop ] ? `${prop}: ${this[ prop ]}` : undefined)
    ]
      .filter((key) => !!key) } }`;
  }
}

/**
 * Representation of a component method
 */
export class Method extends RefUpdaterMixin(JSDocMixin(DecoratorsMixin())) {
  /**
   * Additional statements to be injected at the beginning or the end of method body.
   * Hooks will always be placed after `super` calls and before `return`
   */
  public hooks: Array<MethodHook> = [];

  /** Methods accessor (get, set, or none) */
  public get accessor(): string {
    return isGetAccessorDeclaration(this.declaration) && "get " || isSetAccessorDeclaration(this.declaration) && "set " || "";
  }

  /** Method arguments list */
  public get arguments(): Array<string> {
    if (isFunctionLike(this.declaration) && this.declaration.parameters) {
      return this.declaration.parameters.map((param) => param.getText());
    } else if (this.args) {
      return this.args.map(({ text }) => text);
    } else {
      return [];
    }
  }

  /** Method arguments names list (without type declaration) */
  public get argumentsNoType(): Array<string> {
    if (isFunctionLike(this.declaration) && this.declaration.parameters) {
      return this.declaration.parameters.map((param) => param.name.getText());
    } else if (this.args) {
      return this.args.map(({ text }) => text);
    } else {
      return [];
    }
  }

  /**
   * Whether the method is static
   */
  public get isStatic() {
    return isStatic(this.declaration as MethodDeclaration);
  }

  /** List of method body statements */
  private get statements(): Array<string> {
    const applyHooks = (statements) => (hook) => {
      switch (hook.place) {
        case "beforeend":
          statements.splice(
            statements.length - statements
              .slice()
              .sort((a, b) => b - a)
              .findIndex((statement) => statement.startsWith("return")) + 1,
            0,
            hook.statement
          );
          break;
        case "afterbegin":
          statements.splice(
            statements.findIndex((statement) => statement.startsWith("super")) + 1,
            0,
            hook.statement
          );
          break;
        default:
          break;
      }
    };
    if (isFunctionLike(this.declaration)) {
      if (isBlock(this.declaration.body)) {
        const statements = this.declaration.body.statements.map(this.getText);
        this.hooks.forEach(applyHooks(statements));
        if (this.skipSuper) {
          return statements.filter((statement) => !/\s*super\(.*?\);?/.test(statement));
        }
        return statements;
      } else {
        const statements = [];
        this.hooks.forEach(applyHooks(statements));
        return [ ...statements, `return ${this.getText(this.declaration.body)};` ];
      }
    } else {
      const statements = [];
      this.hooks.forEach(applyHooks(statements));
      return [ ...statements, `return ${this.getText(this.declaration)};` ];
    }
  }

  constructor(
    public readonly declaration: FunctionLikeDeclaration | Expression,
    public readonly name = "function",
    public args?: Array<Identifier>
  ) {
    super();
  }

  /**
   * Return a method clone
   *
   * @returns Cloned method
   */
  public clone(): Method {
    return Object.assign(new Method(null, null), this);
  }

  /**
   * Update method with provided data
   *
   * @params data Data to override method with
   *
   * @returns Reference to this instance (to allow chaining)
   */
  public update(data: {[K in keyof Method]?: Method[K]}) {
    Object.entries(data).forEach(([ key, value ]) => {
      if (Array.isArray(value)) {
        this[ key ] = this[ key ].concat(value);
      } else {
        Object.assign(this, { [key]: value });
      }
    });
    return this;
  }

  public toString() {
    return `${this.accessor}${this.name}(${this.arguments.join(", ")}) { ${this.statements.join("\n")} }`;
  }
}

/**
 * Representation of a component
 */
export class Component extends RefUpdaterMixin(JSDocMixin(DecoratorsMixin())) {
  public config: CustomElementOptions = {
    stripWhitespace: false,
    autoRegisterProperties: true
  };

  /** Components name */
  public get name(): string {
    return this.declaration.name.getText();
  }

  /** Components extends list */
  public get heritage(): string {
    if (!this.declaration.heritageClauses) {
      return null;
    }
    const heritage = this.getText(
      this.declaration.heritageClauses
        .filter(({ token }) => token === SyntaxKind.ExtendsKeyword)
        .reduce((a, c) => c, null)
    ).trim().replace(/^extends\s+/, "");
    switch (this.config.mutableData) {
      case "on":
        return `Polymer.MutableData(${heritage})`;
      case "optional":
        return `Polymer.OptionalMutableData(${heritage})`;
      default:
        return heritage;
    }
  }

  /** Components behaviors list */
  public get behaviors(): Array<Node> {
    const extend = (this.declaration.heritageClauses || [] as Array<HeritageClause>).find(isExtendsDeclaration);
    if (!extend) {
      return [];
    }

    const mixin = extend.types
      .map((type) => type.expression)[ 0 ] as CallExpression & { expression: PropertyAccessExpression };

    if (!isCallExpression(mixin)) {
      return [];
    }
    const mixinName = mixin.expression.name;
    if (!mixinName || mixinName.getText() !== "mixinBehaviors") {
      return [];
    }
    const behaviors = mixin.arguments[ 0 ] as ArrayLiteralExpression;
    return behaviors.elements.map((behavior) => Object.assign(
      {},
      behavior,
      { toString: this.getText.bind(this, behavior) }
    ));
  }

  /** Components template */
  public template: Template;

  /** Components styles */
  public styles: Array<Style> = [];

  /** Events fired by the component */
  public events: Array<RegisteredEvent> = [];

  /** Components properties map */
  public properties: Map<string, Property> = new Map();

  /** Components methods map */
  public methods: Map<string, Method> = new Map();

  /** List of observers */
  public observers: Array<string> = [];

  /** Components static properties map */
  public staticProperties: Map<string, Property> = new Map();

  /** Components static methods map */
  public staticMethods: Map<string, Method> = new Map();

  constructor(public readonly declaration: ClassDeclaration) {
    super();

    this.decorate(this, this.decorators);

    this.declaration
      .members
      .filter(isPropertyDeclaration)
      .filter(notPrivate)
      .filter(notStatic)
      .map((property: PropertyDeclaration) => new Property(property, property.name.getText()))
      .map((property) => this.decorate(property, property.decorators))
      .forEach((property: Property) => this.config.autoRegisterProperties ? this.properties.set(property.name, property) : null);

    this.declaration
      .members
      .filter(isPropertyDeclaration)
      .filter(isStatic)
      .map((property: PropertyDeclaration) => new Property(property, property.name.getText()))
      .forEach((property: Property) => this.staticProperties.set(property.name, property));

    this.declaration
      .members
      .filter(isOneOf(isFunctionLike, isGetAccessorDeclaration, isSetAccessorDeclaration))
      .filter(notStatic)
      .map((method: MethodDeclaration) => new Method(method, method.name ? method.name.getText() : "constructor"))
      .map((method) => this.decorate(method, method.decorators))
      .forEach((method: Method) => {
        if (this.methods.has(method.name)) {
          this.methods.get(method.name).update(method);
        } else {
          this.methods.set(method.name, method);
        }
      });

    this.declaration
      .members
      .filter(isOneOf(isFunctionLike, isGetAccessorDeclaration, isSetAccessorDeclaration))
      .filter(isStatic)
      .map((method: MethodDeclaration) => new Method(method, method.name ? method.name.getText() : "constructor"))
      .forEach((method: Method) => this.staticMethods.set(method.name, method));

    if (this.methods.has("template")) {
      this.template = Template.fromMethod(this.methods.get("template").declaration as MethodDeclaration);

      this.methods.delete("template");
    }

    const fileName = getRoot(this.declaration).fileName;
    const implicitTemplateName = `${parse(fileName).name}.html`;
    if (!this.template && existsSync(resolve(dirname(fileName), implicitTemplateName))) {
      this.template = Template.fromLink(new Link(implicitTemplateName, declaration as Node));
    }
  }

  /**
   * Decorate a property, method or a component with each decorator from a list
   *
   * @param member Property, method or component to decorate
   * @param decorators list of decorators to apply
   *
   * @returns Member provided (to allow chained calls)
   */
  private decorate(member: Property | Method | Component, decorators: Array<ParsedDecorator>): Property | Method | Component {
    decorators.forEach((decor) => {
      if (decor.name in decoratorsMap) {
        const { methods = [], properties = [], observers = [], hooks = new Map() } = (decoratorsMap[ decor.name ].call(
          decor,
          member,
          ...(decor.arguments || [])
        ) || {}) as DecoratorExtras;
        properties.forEach((property) => {
          if (this.properties.has(property.name)) {
            Object.assign(this.properties.get(property.name), property);
          } else if (property instanceof Property) {
            this.properties.set(property.name, property);
          } else {
            const decorText = decor.declaration.getText();
            const sourceFile = getRoot(decor.declaration);
            const position = sourceFile.getLineAndCharacterOfPosition(decor.declaration.pos);
            console.error(
              `${sourceFile.fileName}:${position.line + 1} :: @${decorText} is trying to decorate property \`${property.name}\`, ` +
              `but it's not found. Are you sure it's declared?`
            );
          }
        });
        methods.forEach((method) => {
          if (this.methods.has(method.name)) {
            Object.assign(this.methods.get(method.name), method);
          } else {
            this.methods.set(method.name, method as Method);
          }
        });
        observers.forEach((observer) => this.observers.push(observer));
        hooks.forEach((hook, name) => {
          if (!this.methods.has(name)) {
            this.methods.set(name, new Method(createFunctionDeclaration([], [], null, name, [], [], null, createBlock([])), name));
          }
          this.methods.get(name).update({ hooks: [ hook ] });
        });
      }
    });
    return member;
  }
}

/**
 * Representation of a module. Converting to string generates a final output.
 */
export class Module {
  /**
   * Module name (for module/namespace declaration)
   */
  public get name() {
    return isModuleDeclaration(this.source) ? this.source.name.getText() : "";
  }

  /** Imports list */
  public get imports(): Array<Import> {
    return this.statements
      .filter((statement) => statement instanceof Import)
      .filter((statement: Import) => statement.isImportable) as Array<Import>;
  }

  /** List of Components */
  public get components(): Array<Component> {
    return Array
      .from(this.variables.values())
      .filter((variable) => variable instanceof Component);
  }

  /** List of Custom Events */
  public get events(): Array<RegisteredEvent> {
    return Array
      .from(this.variables.values())
      .filter((variable) => variable instanceof RegisteredEvent);
  }

  /** List of statements */
  public readonly statements: Array<Statement | Component | Import | Module> = [];

  /** Map of variable identifiers to variables */
  public readonly variables: Map<string, ImportedNode | any> = new Map();

  constructor(
    public readonly source: SourceFile | ModuleDeclaration,
    public readonly compilerOptions: CompilerOptions,
    public readonly output: "Polymer1" | "Polymer2",
    public readonly parent: Module = null
  ) {
    (isModuleDeclaration(source) ? source.body as ModuleBlock : source).statements.forEach((statement) => {
      if (isImportDeclaration(statement)) {
        const declaration = new Import(statement);
        declaration.imports.forEach((imp) => this.variables.set(imp.identifier, imp));
        this.statements.push(declaration);
        return;
      } else if (isInterfaceDeclaration(statement)) {
        const name = statement.name.getText();
        if (inheritsFrom(statement, "CustomEvent", "Event")) {
          this.variables.set(name, new RegisteredEvent(statement));
        } else {
          this.variables.set(name, statement);
        }
      } else if (isClassDeclaration(statement) && hasDecorator(statement, "CustomElement")) {
        const component = new Component(statement as ClassDeclaration);

        this.variables.set(component.name, component);
        this.statements.push(component);
        return;
      } else if (isModuleDeclaration(statement)) {
        const module = new Module(statement, compilerOptions, this.output, this);
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

  public toString(): string {
    return new buildTargets[ this.output ](this).toString();
  }
}
