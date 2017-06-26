import { existsSync } from "fs";
import { dirname, extname, parse, resolve } from "path";
import {
  ClassDeclaration, ClassElement, CompilerOptions, ExpressionStatement, FunctionExpression, ImportDeclaration, ImportSpecifier,
  InterfaceDeclaration, JSDoc, MethodDeclaration, ModuleBlock, ModuleDeclaration, NamespaceImport, Node, PropertyDeclaration,
  PropertySignature, SourceFile, Statement, SyntaxKind, TypeLiteralNode, TypeNode
} from "typescript";
import * as decoratorsMap from "./decorators";
import {
  getDecorators, getFlatHeritage, getRoot, hasDecorator, hasModifier, inheritsFrom, InitializerWrapper, isBlock, isClassDeclaration,
  isExportAssignment, isExportDeclaration, isImportDeclaration, isInterfaceDeclaration, isMethod, isModuleDeclaration, isNamedImports,
  isProperty, isStatic, isTemplateExpression, Link, notPrivate, notStatic, ParsedDecorator, RefUpdater, stripQuotes
} from "./helpers";
import * as buildTargets from "./targets";
import { parseDeclaration, parseDeclarationType, ValidValue } from "./type-analyzer";

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

  /** Imported entity name with namespace */
  public get fullIdentifier() {
    return `${this.importClause.namespace ? `${this.importClause.namespace}.` : ""}${this.bindings.name.getText()}`;
  }

  constructor(public readonly bindings: ImportSpecifier | NamespaceImport, public readonly importClause: Import) {
  }
}

/**
 * Representation of an import. Provides a list of ImportedNode's, module path and a namespace.
 * When converted to a string, it returns an HTML Import for HTML files, script tak for JS files and link for CSS files.
 *
 * @todo fetch namespace from external module
 */
export class Import {
  /** Module path */
  public module: string;
  /** Module namespace */
  public namespace: string;
  /** List of imported entities */
  public imports: Array<ImportedNode> = [];

  /** Checks if module is importable (module path ends with .js, .html or .css) */
  public get isImportable() {
    const { module } = this;
    return [ ".js", ".html", ".css" ].includes(extname(module));
  }

  constructor(public readonly declaration: ImportDeclaration) {
    const { 1: module, 2: namespace = "" } = declaration.moduleSpecifier.getText().replace(/["']$|^["']/g, "").match(/([^#]+)(?:#(.+))?/);
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

  public toString(): string {
    switch (extname(this.module)) {
      case ".html":
        return `<link rel="import" href="${this.module}">`;
      case ".js":
        return `<script src="${this.module}"></script>`;
      case ".css":
        return `<link rel="stylesheet" href="${this.module}">`;
      default:
        return `<link rel="import" href="${this.module}">`;
    }
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
export class Property extends RefUpdater {
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
  public get readOnly(): boolean {
    return hasModifier(this.declaration, SyntaxKind.ReadonlyKeyword);
  }

  /** Property decorators */
  public get decorators(): Array<ParsedDecorator> {
    return getDecorators(this.declaration);
  }

  /** JSDoc for the property */
  public get jsDoc(): string {
    const jsDoc = this.declaration[ "jsDoc" ] as Array<JSDoc>;
    return jsDoc ? `${jsDoc.map((doc) => doc.getText()).join("\n")}\n` : "";
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
    const props = [ "value", "readOnly", "reflectToAttribute", "notify", "computed", "observer" ];

    const isSimpleConfig = this.type && this.value === undefined && props.slice(1).every((prop) => !this[ prop ]);

    return isSimpleConfig ? this.type.name : `{ ${ [
      `type: ${this.type.name}`,
      ...props.map((prop) => this[ prop ] ? `${prop}: ${this[ prop ]}` : undefined)
    ]
      .filter((key) => !!key) } }`;
  }
}

/**
 * Representation of a component method
 */
export class Method extends RefUpdater {
  /** JSDoc for the method */
  public get jsDoc(): string {
    const jsDoc = this.declaration[ "jsDoc" ] as Array<JSDoc>;
    return jsDoc ? `${jsDoc.map((doc) => doc.getText()).join("\n")}\n` : "";
  }

  /** Property decorators */
  public get decorators(): Array<ParsedDecorator> {
    return getDecorators(this.declaration as any);
  }

  /** Method arguments list */
  public get arguments(): Array<string> {
    if (!this.declaration.parameters) {
      return [];
    }
    return this.declaration.parameters.map((param) => param.getText());
  }

  /** Method arguments names list (without type declaration) */
  public get argumentsNoType(): Array<string> {
    if (!this.declaration.parameters) {
      return [];
    }
    return this.declaration.parameters.map((param) => param.name.getText());
  }

  /** List of method body statements */
  private get statements(): Array<string> {
    if (isBlock(this.declaration.body)) {
      const statements = this.declaration.body.statements.map(this.getText);
      if (this.skipSuper) {
        return statements.filter((statement) => !/\ssuper\(.*?\);?/.test(statement));
      }
      return statements;
    } else {
      return [ `return ${this.getText(this.declaration.body as MethodDeclaration)};` ];
    }
  }

  constructor(public readonly declaration: MethodDeclaration | FunctionExpression, public readonly name = "function") {
    super();
  }

  public toString() {
    const name = isStatic(this.declaration as ClassElement) ? "function" : this.name;
    return `${name}(${this.arguments.join(", ")}) { ${this.statements.join("\n")} }`;
  }
}

/**
 * Representation of a component
 */
export class Component {
  /** Components name */
  public get name(): string {
    return this.source.name.getText();
  }

  /** JSDoc for the component */
  public get jsDoc(): string {
    const jsDoc = this.source[ "jsDoc" ] as Array<JSDoc>;
    return jsDoc ? `\n<!--\n${
      jsDoc
        .map((doc) => doc
          .getText()
          .split("\n")
          .slice(1, -1)
          .map((line) => line.slice(3))
          .join("\n")
        )
        .join("\n")
      }\n-->` : "";
  }

  /** Components extends list */
  public get heritage(): string {
    if (!this.source.heritageClauses) {
      return null;
    }
    return this.source.heritageClauses
      .filter(({ token }) => token === SyntaxKind.ExtendsKeyword)
      .reduce((a, c) => c, null).getText().slice(8);
  }

  /** Components template */
  public template: string | Link;

  /** Components styles */
  public styles: Array<Style> = [];

  /** Components behaviors list */
  public behaviors: Array<string> = [];

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

  /** Property decorators */
  public get decorators(): Array<ParsedDecorator> {
    return getDecorators(this.source);
  }

  constructor(public readonly source: ClassDeclaration) {
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
      .map((method: MethodDeclaration) => new Method(method, method.name ? method.name.getText() : "constructor"))
      .map((method) => this.decorate(method, method.decorators))
      .forEach((method: Method) => this.methods.set(method.name, method));

    this.source
      .members
      .filter(isMethod)
      .filter(isStatic)
      .map((method: MethodDeclaration) => new Method(method, method.name ? method.name.getText() : "constructor"))
      .forEach((method: Method) => this.staticMethods.set(method.name, method));

    this.decorate(this, this.decorators);

    if (this.methods.has("template")) {
      // todo: improve and test
      this.template = this.methods.get("template")
        .declaration.body.statements
        .map((statement: ExpressionStatement) => {
          const tpl = statement.expression;
          if (isTemplateExpression(tpl)) {
            return `${tpl.head.text}${
              tpl
                .templateSpans
                .map((span) => `{{${span.expression.getText().replace("this.", "")}}}${span.literal.text}`)
                .join("")
              }`;
          } else {
            return stripQuotes(tpl.getText());
          }
        })
        .join("");

      this.methods.delete("template");
    }

    const fileName = getRoot(this.source).fileName;
    const implicitTemplateName = `${parse(fileName).name}.html`;
    if (!this.template && existsSync(resolve(dirname(fileName), implicitTemplateName))) {
      this.template = new Link(implicitTemplateName, source as Node);
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
        const { methods = [], properties = [], observers = [] } = decoratorsMap[ decor.name ].call(
          decor,
          member,
          ...(decor.arguments || [])
        ) || {};
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
            this.methods.set(method.name, method);
          }
        });
        observers.forEach((observer) => this.observers.push(observer));
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

  constructor(public readonly source: SourceFile | ModuleDeclaration,
              public readonly compilerOptions: CompilerOptions,
              public readonly output: "Polymer1" | "Polymer2",
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
          this.variables.get(name).behaviors.push(...getFlatHeritage(statement, this.variables));
        } else if (inheritsFrom(statement, "CustomEvent", "Event")) {
          this.variables.set(name, new RegisteredEvent(statement));
        } else {
          this.variables.set(name, statement);
        }
      } else if (isClassDeclaration(statement) && hasDecorator(statement, "CustomElement")) {
        const component = new Component(statement as ClassDeclaration);

        if (this.variables.has(component.name) && !(this.variables.get(component.name) instanceof Component)) {
          const heritage = getFlatHeritage(this.variables.get(component.name), this.variables);
          component.behaviors.push(...heritage);
        }

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
