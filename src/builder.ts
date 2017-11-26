import { existsSync } from "fs";
import { dirname, extname, join, normalize, parse, relative, resolve } from "path";
import { CustomElementOptions } from "twc/polymer";
import {
  ArrayLiteralExpression, BinaryExpression, CallExpression, ClassDeclaration, ClassExpression, ClassLikeDeclaration, CompilerOptions,
  createBlock,
  createFunctionDeclaration, Expression, ExpressionStatement, forEachChild, FunctionDeclaration, FunctionExpression,
  FunctionLikeDeclaration, getMutableClone, HeritageClause, Identifier, ImportDeclaration, ImportSpecifier, InterfaceDeclaration,
  isArrowFunction, isBinaryExpression, isBlock, isCallExpression, isClassDeclaration, isClassExpression, isConditionalExpression,
  isExportAssignment, isExportDeclaration, isFunctionDeclaration, isFunctionExpression, isFunctionLike, isGetAccessorDeclaration,
  isImportDeclaration, isInterfaceDeclaration, isModuleDeclaration, isNamedImports, isPropertyAccessExpression, isPropertyDeclaration,
  isSetAccessorDeclaration, isTemplateExpression, isVariableStatement, MethodDeclaration, ModuleBlock, ModuleDeclaration, NamespaceImport,
  Node, NoSubstitutionTemplateLiteral, PropertyAccessExpression, PropertyDeclaration, PropertySignature, SourceFile, Statement,
  StringLiteral, SyntaxKind, TemplateExpression, TypeLiteralNode, TypeNode
} from "typescript";
import { cache, outPath, paths, projectRoot } from "./config";
import * as decoratorsMap from "./decorators";
import { DecoratorExtras } from "./decorators";
import {
  buildObservers,
  buildProperties, DecoratorsMixin, getReturnStatements, getRoot, hasDecorator, hasModifier, inheritsFrom, InitializerWrapper,
  isAssignmentExpression, isExtendsDeclaration, isOneOf, isStatic, JSDocMixin, Link, notPrivate, notStatic, ParsedDecorator, pathToURL,
  RefUpdaterMixin, stripQuotes
} from "./helpers";
import * as buildTargets from "./targets";
import { getDeclarationType, parseDeclaration, ValidValue } from "./type-analyzer";

/**
 * Method hook interface
 */
export interface MethodHook {
  place: "beforeend" | "afterbegin";
  statement: string;
}

/**
 * Representation of an imported entity. Provides an imported identifier and fullIdentifier (identifier with namespace if provided).
 */
export class ImportedNode {
  /** Imported entity name */
  public get identifier() {
    return this.bindings.name.getText();
  }

  constructor(public readonly bindings: ImportSpecifier | NamespaceImport, public readonly importClause: Import) {
  }

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
    return [ ".js", ".html", ".css" ].includes(extname(this.module)) || /^\.\.?\//.test(this.module);
  }

  /** Calculate path from file to project root */
  private get rootPath() {
    return relative(dirname(outPath(getRoot(this.declaration).fileName)), projectRoot);
  }

  constructor(public readonly declaration: ImportDeclaration, variables?: Map<string, ImportedNode | any>) {
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
    if (variables) {
      this.imports.forEach((imp) => variables.set(imp.identifier, imp));
    }
  }

  public toString(): string {
    switch (extname(this.module)) {
      case ".js":
        return `<script src="${this.resolveModule()}"></script>`;
      case ".css":
        return `<link rel="stylesheet" href="${this.resolveModule()}">`;
      default:
        return `<link rel="import" href="${this.resolveModule(".html")}">`;
    }
  }

  /**
   * Resolve absolute module paths based on repo name, outDir and rootDir
   *
   * @returns Resolved module/component path
   */
  private resolveModule(ext = "") {
    const [ , repo = "", path = this.module ] = this.module.match(/(?:([a-z]+):)?(.*?(\.[\w\d]+)?)$/) || [];
    let modulePath = path;
    if (repo in paths) {
      modulePath = join(paths[ repo ], path);
    } else if (repo) {
      modulePath = join(repo, path);
    } else if (path.startsWith("~")) {
      modulePath = path.substr(1);
    } else if (/^\.\.?\//.test(path)) {
      return pathToURL(`${path}${ext}`);
    } else {
      return pathToURL(path);
    }
    return pathToURL(normalize(join(this.rootPath, modulePath)));
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
   * @param fun Method to use as a declaration declaration
   *
   * @returns New template
   */
  public static fromMethod(fun: MethodDeclaration): Template {
    return new Template((fun.body.statements.reduce((p, c) => c) as ExpressionStatement).expression as TemplateExpression);
  }

  /**
   * Create a template from a link
   *
   * @param link Link to use to fetch the declaration
   *
   * @returns New template
   */
  public static fromLink(link: Link): Template {
    return Object.assign(new Template(null), { link });
  }

  /**
   * Create a template from a string
   *
   * @param src String declaration to use as a template
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
      type: getDeclarationType(member as any)
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
  public type: Identifier;
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
    const { value, proto: type } = parseDeclaration(declaration);

    Object.assign(this, { type, value });
  }

  public toString() {
    if (this.value instanceof InitializerWrapper) {
      (this.value as InitializerWrapper).provideRefs(this.refs);
    }
    if (isStatic(this.declaration)) {
      return `${this.value}`;
    }
    const props = [ "readOnly", "reflectToAttribute", "notify", "computed", "observer" ];

    const type = this.type || { text: "Object" };

    const isSimpleConfig = type && this.value === undefined && props.every((prop) => !this[ prop ]);

    return isSimpleConfig ? type.text : `{ ${ [
      `type: ${type.text}`,
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

  constructor(public readonly declaration: FunctionLikeDeclaration | Expression,
              public readonly name = "function",
              public args?: Array<Identifier>) {
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
    Object
      .keys(data)
      .map((key) => [ key, data[ key ] ])
      .forEach(([ key, value ]) => {
        if (Array.isArray(value)) {
          this[ key ] = this[ key ].concat(value);
        } else {
          Object.assign(this, { [ key ]: value });
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

  constructor(public readonly declaration: ClassDeclaration, variables?: Map<string, ImportedNode | any>) {
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
    if (variables) {
      variables.set(this.name, this);
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

export function fetchProperties(declaration: ClassLikeDeclaration) {
  if (!declaration) {
    return [];
  }

  return declaration
    .members
    .filter(isPropertyDeclaration)
    .filter(notPrivate)
    .filter(notStatic)
    .map((property: PropertyDeclaration) => new Property(property, property.name.getText()));
}

export function fetchObservers(declaration: ClassLikeDeclaration) {
  return declaration
    .members
    .filter(isFunctionLike)
    .filter(notStatic)
    .filter((method) => hasDecorator(method, "observe"))
    .map((method: MethodDeclaration) => {
      const observer = method.decorators
        .map(({ expression: exp }) => exp as CallExpression)
        .find(({ expression: exp }) => exp.getText() === "observe");

      const properties = observer.arguments.length > 0 ? observer.arguments : method.parameters.map(({ name }) => name);
      return { name: method.name, args: properties as Array<Identifier>, isComplex: properties.length > 1 };
    });
}

function parseMixinDeclaration(declaration: ClassExpression) {
  const observers = fetchObservers(declaration);
  const properties = fetchProperties(declaration);

  const propertiesMap = new Map(properties.map((property) => [ property.name, property ] as [ string, Property ]));

  observers.filter(({ isComplex }) => !isComplex).forEach(({ name, args }) => {
    const property = propertiesMap.get(args.map(({ text }) => text).pop());
    if (!property) {
      return;
    }
    property.observer = name.getText();
  });

  const observersConfig = buildObservers(observers);
  if (observers.filter(({ isComplex }) => isComplex).length > 0) {
    declaration.members.unshift(observersConfig);
  }

  const propertiesConfig = buildProperties(Array.from(propertiesMap.values()));
  if (properties.length > 0) {
    declaration.members.unshift(propertiesConfig);
  }
}

export function upgradeMixins(statement: FunctionLikeDeclaration) {
  const cc = getMutableClone(statement);
  const params = cc.parameters.map((param) => param.getText());
  if (isBlock(cc.body)) {
    const updated = getReturnStatements(cc.body)
      .map(({ expression }) => expression)
      .filter(isClassExpression)
      .filter((cls) => inheritsFrom(cls, ...params))
      .map(parseMixinDeclaration);

    if (updated.length === 0) {
      return statement;
    }
  } else if (isClassExpression(cc.body) && inheritsFrom(cc.body, ...params)) {
    parseMixinDeclaration(cc.body);
  } else if (isCallExpression(cc.body)) {
    const updated = cc.body.arguments
      .filter(isClassExpression)
      .filter((cls) => inheritsFrom(cls, ...params))
      .map(parseMixinDeclaration);

    if (updated.length === 0) {
      return statement;
    }
  }
  return cc;
}

/**
 * Representation of a module. Converting to string generates a final output.
 */
export class Module {
  /**
   * Module name (for module/namespace declaration)
   */
  public get name() {
    return isModuleDeclaration(this.declaration) ? this.declaration.name.getText() : "";
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

  constructor(public readonly declaration: SourceFile | ModuleDeclaration,
              public readonly compilerOptions: CompilerOptions,
              public readonly output: "Polymer1" | "Polymer2",
              public readonly parent: Module = null) {
    (isModuleDeclaration(declaration) ? declaration.body as ModuleBlock : declaration).statements.forEach((statement) => {
      let resultStatement: Statement | Component | Import | Module = statement;
      if (isImportDeclaration(statement)) { // Handling import statements
        resultStatement = new Import(statement, this.variables);
      } else if (isInterfaceDeclaration(statement)) { // Handling interfaces (like custom events etc)
        if (inheritsFrom(statement, "CustomEvent", "Event")) { // Interface extending events
          this.variables.set(statement.name.getText(), new RegisteredEvent(statement));
        } else { // All the other interfaces (add if-else to handle additional cases)
          this.variables.set(statement.name.getText(), statement);
        }
      } else if (isClassDeclaration(statement)) { // Handling classes
        if (hasDecorator(statement, "CustomElement")) { // Handling classes decorated with CustomElement decorator
          resultStatement = new Component(statement as ClassDeclaration, this.variables);
        } else { // All other classes (add if-else to handle additional cases)
          this.variables.set(statement.name.getText(), statement);
        }
      } else if (isModuleDeclaration(statement)) {  // Handling modules and namespaces
        resultStatement = new Module(statement, compilerOptions, this.output, this);
      } else if (isVariableStatement(statement) || isAssignmentExpression(statement)) {
        const mutable = getMutableClone(statement);
        let access;
        access = isVariableStatement(mutable) ? {
          collection: mutable.declarationList.declarations, use: null,
          get expression() {
            return this.use.initializer;
          },
          set expression(value) {
            this.use.initializer = value;
          }
        } : {
          collection: [ mutable.expression.right ],
          get expression() {
            return (mutable as any).expression.right;
          },
          set expression(value) {
            (mutable as any).expression.right = value;
          }
        };
        const updated = access.collection.filter((node) => {
          access.use = node;
          if (isArrowFunction(access.expression) || isFunctionExpression(access.expression)) {
            const mixin = upgradeMixins(access.expression);
            if (mixin !== access.expression) {
              access.expression = mixin as FunctionExpression;
              return true;
            }
          } else if (isCallExpression(access.expression)) {
            const subUpdated = access.expression.arguments
              .filter((initializer) => isArrowFunction(initializer) || isFunctionExpression(initializer))
              .filter((initializer: FunctionExpression, index, args) => {
                const mixin = upgradeMixins(initializer) as FunctionExpression;
                if (mixin !== initializer) {
                  args[ index ] = mixin as FunctionExpression;
                  return true;
                }
                return false;
              });
            return subUpdated.length > 0;
          }
          return false;
        });

        if (updated.length > 0) {
          resultStatement = mutable;
        }
      } else if (isFunctionDeclaration(statement)) {
        resultStatement = upgradeMixins(statement) as FunctionDeclaration;
      } else if (isExportDeclaration(statement) || isExportAssignment(statement)) {
        // Do NOT push export statements (allow exceptions for P3 and ES Module based outputs)
        return;
      }
      this.statements.push(resultStatement);
    });

    // Add found declared events events to each component found within module
    this.components.forEach((component) => component.events.push(...this.events));

    if (parent) {
      parent.variables.set(this.name, this);
    }
  }

  public toString(): string {
    return new buildTargets[ this.output ](this).toString();
  }
}
