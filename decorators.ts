import { Component, Method, Property, Style } from './builder';
import { Link, ParsedDecorator } from './helpers';
import { CallExpression } from 'typescript/lib/typescript';

interface DecoratorExtras {
  methods?: Array<Method>;
  properties?: Array<{ name: string, observer: string }>;
  observers?: Array<string>;
}

export function attr(this: ParsedDecorator, property: Property) {
  property.reflectToAttribute = true;
}

export function compute(this: ParsedDecorator, property: Property, ref: string | Method, args: Array<string> = []): DecoratorExtras {
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
}
export function notify(this: ParsedDecorator, property: Property) {
  property.notify = true;
}
export function observe(this: ParsedDecorator, method: Method, ...args): DecoratorExtras {
  if (args.length === 0) {
    args = method.argumentsNoType;
  }
  if (args.length === 1 && !args[ 0 ].includes('.')) {
    return { properties: [ { name: args[ 0 ], observer: `"${method.name}"` } ] };
  }
  return { observers: [ `${method.name}(${args.join(', ')})` ] };
}
export function style(this: ParsedDecorator, component: Component, ...styles: Array<string>) {
  component.styles = styles.map((css) => {
    if (css.endsWith('.css')) {
      return new Style(new Link(css, this.declaration as CallExpression));
    } else {
      return new Style(css, /^[\w\d]+(-[\w\d]+)+$/.test(css));
    }
  });
}
export function template(this: ParsedDecorator, component: Component, src: string) {
  component.template = src.endsWith('.html') ? new Link(src, this.declaration as CallExpression) : src;
}
