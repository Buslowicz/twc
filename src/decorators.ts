import { CustomElementOptions } from "twc/polymer";
import { Component, Method, Property, Style, Template } from "./builder";
import { getQuoteChar, Link, ParsedDecorator } from "./helpers";

/**
 * Additional meta data returned from a decorator (extra methods, properties and observers)
 */
interface DecoratorExtras {
  methods?: Array<Method>;
  properties?: Array<{ name: string, observer: string }>;
  observers?: Array<string>;
}

/**
 * Set `reflectToAttribute` of the component to true
 *
 * @this ParsedDecorator
 * @param property Property to decorate
 */
export function attr(this: ParsedDecorator, property: Property): void {
  property.reflectToAttribute = true;
}

/**
 * Set `computed` method for the property. If method name is provided, uses existing method. Otherwise, creates a new method and returns it.
 *
 * @this ParsedDecorator
 * @param property Property to decorate
 * @param ref Resolver as a method or a name of method from components prototype
 * @param args Array of arguments for resolver method
 *
 * @returns Object with added methods array
 */
export function compute(this: ParsedDecorator, property: Property, ref: string | Method, args: Array<string> = []): DecoratorExtras {
  if (args.length === 0 && typeof ref !== "string") {
    args = ref.argumentsNoType;
  }
  const quote = getQuoteChar(this.declaration);
  if (typeof ref === "string") {
    property.computed = `${quote}${ref}(${args.join(", ")})${quote}`;
    return { methods: [] };
  } else {
    property.computed = `${quote}${ref.name}(${args.join(", ")})${quote}`;
    return { methods: [ ref ] };
  }
}

/**
 * Set `notify` of the component to true
 *
 * @this ParsedDecorator
 * @param property Property to decorate
 */
export function notify(this: ParsedDecorator, property: Property): void {
  property.notify = true;
}

/**
 * Set `observer` of the property to provided method if there is only one dependency, otherwise add entry to observers.
 *
 * @this ParsedDecorator
 * @param method Method to trigger whenever any dependency changes
 * @param args List of dependencies
 *
 * @returns Patch for a property to update or observers to concat to all observers list
 */
export function observe(this: ParsedDecorator, method: Method, ...args: Array<string>): DecoratorExtras {
  if (args.length === 0) {
    args = method.argumentsNoType;
  }
  if (args.length === 1 && !args[ 0 ].includes(".")) {
    const quote = getQuoteChar(this.declaration);
    return { properties: [ { name: args[ 0 ], observer: `${quote}${method.name}${quote}` } ] };
  }
  return { observers: [ `${method.name}(${args.join(", ")})` ] };
}

/**
 * Add styles to a component
 *
 * @this ParsedDecorator
 * @param component Component to add styles to
 * @param styles Array of styles to add to the component
 */
export function style(this: ParsedDecorator, component: Component, ...styles: Array<string>): void {
  component.styles = styles.map((css) => {
    if (css.endsWith(".css")) {
      return new Style(new Link(css, this.declaration));
    } else {
      return new Style(css, /^[\w\d]+(-[\w\d]+)+$/.test(css));
    }
  });
}

/**
 * Set template for the component
 *
 * @param component Component to add styles to
 * @param src Source of the template
 */
export function template(this: ParsedDecorator, component: Component, src: string): void {
  component.template = src.endsWith(".html") ? Template.fromLink(new Link(src, this.declaration)) : Template.fromString(src);
}

/**
 * Optional component config
 *
 * @param component Component to add styles to
 * @param config Config object
 */
export function CustomElement(this: ParsedDecorator, component: Component, config?: CustomElementOptions): void {
  if (!config) {
    return;
  }
  Object.assign(component.config, config);

  if (config.template) {
    template.call(this, component, config.template);
  }

  if (config.styles) {
    style.call(this, component, ...(Array.isArray(config.styles) ? config.styles : [ config.styles ]));
  }
}
