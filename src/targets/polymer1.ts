import * as pretty from "pretty";
import { ModuleKind, Statement, transpileModule } from "typescript";
import { Component, Import, ImportedNode, Module } from "../builder";
import { getQuoteChar, updateImportedRefs } from "../helpers";

/**
 * Outputs Polymer v1 native component.
 */
export class Polymer1 {
  /** Map v1 lifecycle to v0 lifecycle methods. */
  protected static lifecycleMap = {
    attributeChangedCallback: "attributeChanged",
    connectedCallback: "attached",
    constructor: "created",
    disconnectedCallback: "detached"
  };

  constructor(protected module: Module) {
    this.validate();
  }

  /** Find first component of the module. */
  protected get component(): Component {
    const component: Component = this.module.statements.find((statement) => statement instanceof Component) || this.module.statements
      .filter((statement) => statement instanceof Component || statement instanceof Module)
      .reduce((all, statement) => all.concat(statement instanceof Module ? statement.components : statement), [])
      .find((statement) => statement instanceof Component);
    return component ? component.provideRefs(this.importedRefs) : component;
  }

  /** Get all imports from module up to the root module (declaration file). */
  protected get imports(): Array<Import> {
    const imports = [];
    for (let node = this.module; node; node = node.parent) {
      imports.push(...node.imports);
    }
    return imports;
  }

  /** Get all imported entities. */
  protected get importedRefs(): Map<string, ImportedNode> {
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
  protected get body(): string {
    return this.module.statements
      .filter((statement) => !(statement instanceof Import))
      .map((statement: Statement | Component | Module) => {
        if (statement instanceof Module) {
          return statement.toString();
        } else if (statement instanceof Component) {
          return this.componentScript(statement);
        } else {
          const updatedStatement = updateImportedRefs(statement, this.importedRefs);
          return this.module.parent ? updatedStatement : updatedStatement.replace(/^(\s*)(export (default )?)/m, "$1");
        }
      })
      .join("\n");
  }

  /** Generate a dom module. */
  protected get domModule(): string {
    // Forcing ES2015 modules to prevent code pollution with loaders boilerplate code
    const compilerOptions = Object.assign(this.module.compilerOptions, { module: ModuleKind.ES2015 });
    const { body, component, imports } = this;
    const script = body ? `<script>${transpileModule(body, { compilerOptions }).outputText}</script>` : "";

    return `${imports.join("\n")}${component ? `${component.htmlDoc}
    <dom-module id="${component.config.name || component.name.replace(/([A-Z])/g, (_, l, i) => (i ? "-" : "") + l.toLowerCase())}">${
      component.template ? `
      <template${component.config.stripWhitespace ? " strip-whitespace" : ""}>
        ${component.styles.join("\n")}
        ${component.template.toString().trim()}
      </template>` : ""}
      ${script}
    </dom-module>` : script}`;
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
        console.log(`\`${this.component ? this.component.name : "Module"}\` generated in ${genTime}ms`);
      }
      return html;
    }
  }

  /**
   * Validate the components declaration
   *
   * @throws SyntaxError Will throw an error if class extends something different than Polymer.Element
   */
  protected validate(): void {
    const component = this.component;
    const polymerBase = /^Polymer.mixinBehaviors\(\[.*?],Polymer\.Element\)$|^Polymer\.Element$/;
    const mutableMixin = /^Polymer.(?:Optional)?MutableData/;
    if (!component || typeof component.heritage !== "string") {
      return;
    }
    const heritage = component.heritage.replace(/\s*/g, "");
    if (mutableMixin.test(heritage)) {
      throw new SyntaxError("MutableData is not available in Polymer v1.");
    }
    if (!polymerBase.test(heritage)) {
      throw new SyntaxError("Components in Polymer v1 can only extend `Polymer.Element` class.");
    }
  }

  /**
   * Generate a Polymer v1 Component declaration.
   *
   * @param component Component meta data to create declaration for
   *
   * @returns Stringified component declaration
   */
  protected componentScript(component: Component): string {
    const quote = getQuoteChar(this.module.declaration);
    return `
      const ${component.name} = Polymer({\n${
      component.events.join("\n")
      }${[
      `is: ${quote}${component.config.name || component.name.replace(/([A-Z])/g, (_, l, i) => (i ? "-" : "") + l.toLowerCase())}${quote}`,
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
  protected behaviors(component: Component): string {
    return component.behaviors.length === 0 ? "" : `behaviors: [
      ${component.provideRefs(this.importedRefs, true).behaviors.map((behavior) => `${behavior}`).join(",\n")}
    ]`;
  }

  /**
   * Generate observers declaration for component.
   *
   * @param component Components metadata
   *
   * @returns Stringified observers declaration
   */
  protected observers(component: Component): string {
    const quote = getQuoteChar(this.module.declaration);
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
  protected properties(component: Component): string {
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
  protected methods(component: Component): Array<string> {
    return Array
      .from(component.methods.values())
      .concat(component.template ? Array.from(component.template.methods.values()) : [])
      .map((m) => m.name in Polymer1.lifecycleMap ? m.clone().update({ name: Polymer1.lifecycleMap[ m.name ] }) : m)
      .map((m) => `${m.jsDoc}${m.provideRefs(this.importedRefs, true)}`);
  }

  /**
   * Get static properties list.
   *
   * @param component Components metadata
   *
   * @returns Array of stringified static properties
   */
  protected staticProperties(component: Component): Array<string> {
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
  protected staticMethods(component: Component): Array<string> {
    return Array
      .from(component.staticMethods.values())
      .map((method) => `${method.jsDoc}${component.name}.${method.name} = function ${method.provideRefs(this.importedRefs)};`);
  }
}
