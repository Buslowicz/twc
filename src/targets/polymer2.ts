import { Component, Module } from "../builder";
import { getQuoteChar } from "../helpers";
import { Polymer1 } from "./polymer1";

enum accessorsOrder {
  "static set",
  "static get",
  "static",
  "set",
  "get",
  ""
}

/**
 * Outputs Polymer v2 native component.
 */
export class Polymer2 extends Polymer1 {
  constructor(protected module: Module) {
    super(module);
  }

  protected validate(): void {
    const component = this.component;
    if (component && !component.heritage) {
      throw new SyntaxError("Components in Polymer v2 need to extend a base class (usually `Polymer.Element`).");
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
    const quote = getQuoteChar(this.module.source);
    return `${component.events.join("\n")}
      class ${component.name} extends ${component.heritage} {
      ${[
      `static get is() { return ${quote}${
      component.config.name || component.name.replace(/([A-Z])/g, (_, l, i) => (i ? "-" : "") + l.toLowerCase())
        }${quote} }`,
      this.observers(component),
      this.properties(component),
      ...this.methods(component)
    ].filter((chunk) => !!chunk).join(",\n")}
      }
      customElements.define(${component.name}.is, ${component.name});
      ${this.staticProperties(component).join("\n")}
    `;
  }

  /**
   * Generate observers declaration for component.
   *
   * @param component Components metadata
   *
   * @returns Stringified observers declaration
   */
  protected observers(component: Component): string {
    const quote = getQuoteChar(this.module.source);
    return component.observers.length === 0 ? "" : `static get observers() {\n return [
      ${component.observers.map((observer) => `${quote}${observer}${quote}`).join(",\n")}
    ]; }`;
  }

  /**
   * Generate properties config for component.
   *
   * @param component Components metadata
   *
   * @returns Stringified properties config
   */
  protected properties(component: Component): string {
    return component.properties.size === 0 ? "" : `static get properties() {\n return {
      ${Array.from(component.properties.values(), (p) => `${p.jsDoc}${p.name}: ${p.provideRefs(this.importedRefs)}`).join(",\n")}
    }; }`;
  }

  /**
   * Get methods list.
   *
   * @param component Components metadata
   *
   * @returns Array of stringified methods
   */
  protected methods(component: Component): Array<string> {
    const staticFlag = (method) => method.isStatic ? "static " : "";
    const getOrderIdentifier = (method) => accessorsOrder[ (staticFlag(method) + method.accessor).trim() ];
    return [
      ...component.methods.values(),
      ...(component.template ? component.template.methods.values() : []),
      ...component.staticMethods.values()
    ]
      .sort((a, b) => getOrderIdentifier(a) - getOrderIdentifier(b))
      .map((method) => `${method.jsDoc}${staticFlag(method)}${method.provideRefs(this.importedRefs, false)}`);
  }
}
