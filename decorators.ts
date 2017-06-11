import { Component, Method, Property, Style } from "./builder";
import { getQuoteChar, Link, ParsedDecorator } from "./helpers";

interface DecoratorExtras {
  methods?: Array<Method>;
  properties?: Array<{ name: string, observer: string }>;
  observers?: Array<string>;
}

export function attr(this: ParsedDecorator, property: Property) {
  property.reflectToAttribute = true;
}

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
export function notify(this: ParsedDecorator, property: Property) {
  property.notify = true;
}
export function observe(this: ParsedDecorator, method: Method, ...args): DecoratorExtras {
  if (args.length === 0) {
    args = method.argumentsNoType;
  }
  if (args.length === 1 && !args[ 0 ].includes(".")) {
    const quote = getQuoteChar(this.declaration);
    return { properties: [ { name: args[ 0 ], observer: `${quote}${method.name}${quote}` } ] };
  }
  return { observers: [ `${method.name}(${args.join(", ")})` ] };
}
export function style(this: ParsedDecorator, component: Component, ...styles: Array<string>) {
  component.styles = styles.map((css) => {
    if (css.endsWith(".css")) {
      return new Style(new Link(css, this.declaration));
    } else {
      return new Style(css, /^[\w\d]+(-[\w\d]+)+$/.test(css));
    }
  });
}
export function template(this: ParsedDecorator, component: Component, src: string) {
  component.template = src.endsWith(".html") ? new Link(src, this.declaration) : src;
}
