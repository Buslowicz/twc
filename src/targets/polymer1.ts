import * as pretty from "pretty";
import { ModuleKind, Statement, transpileModule } from "typescript";
import { Component, Import, ImportedNode, Method, Module } from "../builder";
import { getQuoteChar, updateImportedRefs } from "../helpers";

/**
 * Outputs Polymer v1 native component.
 */
export class Polymer1 {
  /** Map v1 lifecycle to v0 lifecycle methods. */
  private static lifecycleMap = {
    attributeChangedCallback: "attributeChanged",
    connectedCallback: "attached",
    constructor: "created",
    disconnectedCallback: "detached"
  };

  /** Find first component of the module. */
  private get component(): Component {
    return this.module.statements.find((statement) => statement instanceof Component) || this.module.statements
        .filter((statement) => statement instanceof Component || statement instanceof Module)
        .reduce((all, statement) => all.concat(statement instanceof Module ? statement.components : statement), [])
        .find((statement) => statement instanceof Component);
  }

  /** Get all imports from module up to the root module (source file). */
  private get imports(): Array<Import> {
    const imports = [];
    for (let node = this.module; node; node = node.parent) {
      imports.push(...node.imports);
    }
    return imports;
  }

  /** Get all imported entities. */
  private get importedRefs(): Map<string, ImportedNode> {
    const importedRefs = new Map();
    for (let node = this.module; node; node = node.parent) {
      node.imports
        .map((mod) => mod.imports)
        .reduce((all, curr) => all.concat(curr), [])
        .forEach((member) => importedRefs.set(member.identifier, member));
    }
    return importedRefs;
  }

  /** Convert statements of a module into a string. */
  private get body(): string {
    return this.module.statements
      .filter((statement) => !(statement instanceof Import))
      .map((statement: Statement) => {
        if (statement instanceof Module) {
          return statement.toString();
        } else if (statement instanceof Component) {
          return this.componentScript(statement);
        } else {
          const updatedStatement = updateImportedRefs(statement, this.importedRefs);
          return this.module.parent ? updatedStatement : updatedStatement.replace(/^(\s*)(export (default )?)/, "$1");
        }
      })
      .join("\n");
  }

  /** Generate a dom module. */
  private get domModule(): string {
    // Forcing ES2015 modules to prevent code pollution with loaders boilerplate code
    const compilerOptions = Object.assign(this.module.compilerOptions, { module: ModuleKind.ES2015 });
    const { body } = this;
    const script = body ? `<script>${transpileModule(body, { compilerOptions }).outputText}</script>` : "";

    return `${this.imports.join("\n")}${this.component ? `${this.component.jsDoc}
    <dom-module is="${this.component.name.replace(/([A-Z])/g, (_, l, i) => (i ? "-" : "") + l.toLowerCase())}">${
      this.component.template ? `
      <template>
        ${this.component.styles.join("\n")}
        ${this.component.template.toString().trim()}
      </template>` : ""}
      ${script}
    </dom-module>` : script}`;
  }

  constructor(private module: Module) {
    const component = this.component;
    if (component && component.heritage && component.heritage !== "Polymer.Element") {
      throw new SyntaxError("Components in Polymer v1 can only extend `Polymer.Element` class.");
    }
  }

  public toString(): string {
    if (this.module.parent) {
      return `namespace ${this.module.name} {\n${this.body}\n}`;
    } else {
      const start = process.hrtime();
      const html = pretty(this.domModule) + "\n";
      const end = process.hrtime();
      if (!process.env[ "SILENT" ]) {
        const fac = 1000000;
        const genTime = Math.round((end[ 0 ] * 1000) + (end[ 1 ] / fac)) - Math.round((start[ 0 ] * 1000) + (start[ 1 ] / fac));
        console.log(`\`${this.component ? this.component.name : "Module"}\` generated in ${genTime}`);
      }
      return html;
    }
  }

  /**
   * Generate a Polymer v1 Component declaration.
   *
   * @param component Component meta data to create declaration for
   *
   * @returns Stringified component declaration
   */
  private componentScript(component: Component): string {
    const quote = getQuoteChar(this.module.source);
    return `
      const ${component.name} = Polymer({\n${
      component.events.join("\n")
      }${[
      `is: ${quote}${component.name.replace(/([A-Z])/g, (_, l, i) => (i ? "-" : "") + l.toLowerCase())}${quote}`,
      this.behaviors(component),
      this.observers(component),
      this.properties(component),
      ...this.methods(component)
    ].filter((chunk) => !!chunk).join(",\n")}
      });
      ${this.staticMethods(component).join("\n")}
      ${this.staticProperties(component).join("\n")}
    `;
  }

  /**
   * Generate behaviors declaration for component.
   *
   * @param component Components metadata
   *
   * @returns Stringified behaviors declaration
   */
  private behaviors(component: Component): string {
    return component.behaviors.length === 0 ? "" : `behaviors: [
      ${component.behaviors.map((behavior) => `${behavior}`).join(",\n")}
    ]`;
  }

  /**
   * Generate observers declaration for component.
   *
   * @param component Components metadata
   *
   * @returns Stringified observers declaration
   */
  private observers(component: Component): string {
    const quote = getQuoteChar(this.module.source);
    return component.observers.length === 0 ? "" : `observers: [
      ${component.observers.map((observer) => `${quote}${observer}${quote}`).join(",\n")}
    ]`;
  }

  /**
   * Generate properties config for component.
   *
   * @param component Components metadata
   *
   * @returns Stringified properties config
   */
  private properties(component: Component): string {
    return component.properties.size === 0 ? "" : `properties: {
      ${Array.from(component.properties.values(), (p) => `${p.jsDoc}${p.name}: ${p.provideRefs(this.importedRefs)}`).join(",\n")}
    }`;
  }

  /**
   * Get methods list.
   *
   * @param component Components metadata
   *
   * @returns Array of stringified methods
   */
  private methods(component: Component): Array<string> {
    return Array
      .from(component.methods.values())
      .map((m) => m.name in Polymer1.lifecycleMap ? new Method(m.declaration, Polymer1.lifecycleMap[ m.name ]) : m)
      .map((m) => `${m.jsDoc}${m.provideRefs(this.importedRefs, true)}`);
  }

  /**
   * Get static properties list.
   *
   * @param component Components metadata
   *
   * @returns Array of stringified static properties
   */
  private staticProperties(component: Component): Array<string> {
    return Array
      .from(component.staticProperties.values())
      .map((prop) => `${prop.jsDoc}${component.name}.${prop.name} = ${prop.provideRefs(this.importedRefs)};`);
  }

  /**
   * Get static methods list.
   *
   * @param component Components metadata
   *
   * @returns Array of stringified static methods
   */
  private staticMethods(component: Component): Array<string> {
    return Array
      .from(component.staticMethods.values())
      .map((method) => `${method.jsDoc}${component.name}.${method.name} = ${method.provideRefs(this.importedRefs)};`);
  }
}
