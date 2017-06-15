import "./polymer";

declare module "twc/polymer" {
  /**
   * Register the class as a component.
   *
   * @example
   * @CustomElement()
   * class MyElement {}
   */
  export function CustomElement(): ClassDecorator;

  /**
   * Add a template to the component.
   *
   * @example
   * @CustomElement()
   * @template('<h1>Hello World</h1>')
   * class MyElement {}
   *
   * @CustomElement()
   * @template('relative/path/to/template.html')
   * class MyElement {}
   *
   * @param tpl Template source.
   */
  export function template(tpl: string): ClassDecorator;

  /**
   * Add styles to the component.
   *
   * @example
   * @CustomElement()
   * @style('.test { color: red; }', 'my-shared-style', `
   *  h1 {
   *    font-size: 1.5em;
   *  }
   *  h2 {
   *    font-size: 1.3em;
   *  }
   * `)
   * class MyElement {}
   *
   * @param styles List of styles to add, either as a shared style, link to the file (to be inlined) or a css
   */
  export function style(...styles: Array<string>): ClassDecorator;

  /**
   * Make the JS property reflect to HTML attribute.
   *
   * @example
   * @CustomElement()
   * class MyElement {
   *  @attr() someProperty: string;
   * }
   */
  export function attr(): PropertyDecorator;

  /**
   * Make property fire an event whenever its value changes. Event name will match "property-name-changed" pattern.
   *
   * @example
   * @CustomElement()
   * class MyElement {
   *  @notify() someProperty: string;
   * }
   */
  export function notify(): PropertyDecorator;

  /**
   * Make the property value to be computed using provided method (or its name) and arguments (optional when providing method with arguments
   * matching class properties).
   *
   * @example
   * @CustomElement()
   * class MyElement {
   *  @compute('resolver', ['name']) computedProperty4: string;
   *
   *  resolver(name) {
   *    return name.toLowerCase();
   *  }
   * }
   *
   * @param method Name of a method from class prototype to be used as a resolver
   * @param args List of dependencies to pass to the resolver
   */
  export function compute(method: string, args: [ string ]): PropertyDecorator;

  /**
   * Make the property value to be computed using provided method (or its name) and arguments (optional when providing method with arguments
   * matching class properties).
   *
   * @example
   * @CustomElement()
   * class MyElement {
   *  @compute((name) => name.toLowerCase()) computedProperty1: string;
   *  @compute((age) => age >= 18, ['user.age']) computedProperty2: boolean;
   *  @compute((firstName, lastName) => `${firstName} ${lastName}`) computedProperty3: string;
   *  @compute((firstName, lastName) => `${firstName} ${lastName}`) computedProperty3: string;
   * }
   *
   * @param method Resolver for the computed property
   * @param [args] List of dependencies to pass to the resolver (by default arguments names of resolver will be used)
   */
  export function compute(method: Function, args?: [ string ]): PropertyDecorator;

  /**
   * Make the method be run whenever any of provided properties change
   *
   * @example
   * @CustomElement()
   * class MyElement {
   *  @observe('name', 'age') observer(name, age) {
   *    return name.toLowerCase() + age;
   *  }
   * }
   *
   * @param props List of properties to observe
   */
  export function observe(...props: Array<string>): MethodDecorator;
}
