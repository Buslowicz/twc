declare module "twc/polymer" {
  /**
   * Polymer property configuration interface.
   * @see https://www.polymer-project.org/2.0/docs/devguide/properties
   */
  export interface PolymerPropertyConfig {
    /** Boolean, Date, Number, String, Array or Object. */
    type?: any;
    /** Default value for the property. */
    value?: any;
    /** Should the property reflect to attribute. */
    reflectToAttribute?: boolean;
    /** Marks property as read-only. */
    readonly?: boolean;
    /** If set to true, will trigger "propname-changed". */
    notify?: boolean;
    /** Computed function call (as string). */
    computed?: string;
    /** Observer function call (as string). */
    observer?: string;
  }

  /**
   * Custom element options interface.
   */
  export interface CustomElementOptions {
    /**
     * Override component tag name.
     */
    name?: string;
    /**
     * Provide a template for the component.
     * @see https://www.polymer-project.org/2.0/docs/devguide/dom-template
     */
    template?: string;
    /**
     * Provide styles for the component.
     * @see https://www.polymer-project.org/2.0/docs/devguide/style-shadow-dom
     */
    styles?: Array<string> | string;
    /**
     * Strip whitespace from the component template.
     * @see https://www.polymer-project.org/2.0/docs/devguide/dom-template#strip-whitespace
     */
    stripWhitespace?: boolean;
    /**
     * Set MutableData or OptionalMutableData on the component (Polymer V2 only).
     * @version ^2.0.0
     * @see https://www.polymer-project.org/2.0/docs/devguide/data-system#mutable-data
     */
    mutableData?: "on" | "off" | "optional";
    /**
     * Automatically register all public properties.
     */
    autoRegisterProperties?: boolean;
  }

  /**
   * Register the class as a component.
   *
   * @example
   * @CustomElement()
   * class MyElement {}
   */
  export function CustomElement(config?: CustomElementOptions): ClassDecorator;

  /**
   * Add a template to the component.
   * @see https://www.polymer-project.org/2.0/docs/devguide/dom-template
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
   * @param tpl Template declaration.
   */
  export function template(tpl: string): ClassDecorator;

  /**
   * Add styles to the component.
   * @see https://www.polymer-project.org/2.0/docs/devguide/style-shadow-dom
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
   * @see https://www.polymer-project.org/2.0/docs/devguide/properties
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
   * @see https://www.polymer-project.org/2.0/docs/devguide/properties
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
   * @see https://www.polymer-project.org/2.0/docs/devguide/observers#computed-properties
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
   * @see https://www.polymer-project.org/2.0/docs/devguide/observers#computed-properties
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
   * Make the method be run whenever any of provided properties change.
   * @see https://www.polymer-project.org/2.0/docs/devguide/observers
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

  /**
   * Make the method be run whenever an event occurs.
   * @see https://www.polymer-project.org/2.0/docs/devguide/events
   *
   * @example
   * @CustomElement()
   * class MyElement {
   *  @listen('click') handler(event) {
   *    console.log('You clicked me!');
   *  }
   *  @listen('custom-init-event', true) init(event) {
   *    console.log('I am only triggered once');
   *  }
   * }
   *
   * @param eventName Name of an event to listen for
   * @param once Should the listener be removed after it's fired?
   */
  export function listen(eventName: string, once?: boolean): MethodDecorator;

  /**
   * Manually register a property
   * @see https://www.polymer-project.org/2.0/docs/devguide/properties
   *
   * @example
   * @CustomElement({ autoRegisterProperties: false })
   * class MyElement {
   *  @property() prop1: string;
   *  @property({ readOnly: true, value: 10, reflectToAttribute: true }) prop2: number;
   * }
   *
   * @param config Polymer property configuration
   */
  export function property(config?: PolymerPropertyConfig): PropertyDecorator;
}
