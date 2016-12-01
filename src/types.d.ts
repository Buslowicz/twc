declare type Replacer = [RegExp, string | ((...args: Array<string>) => string)];

declare interface Decorator {
  src: string;
  name: string;
  params: string;
  descriptor?: string;
}
declare interface FoundMatch {
  index: number;
  found: any;
}
declare interface FoundType {
  end: number;
  type: string;
}
declare interface ParamConfig {
  name: string;
  type?: string
}
declare interface PropertyConfig {
  name: string;
  modifiers: Array<string>;
}
declare interface FieldConfig {
  name: string;
  type: string;
  defaultValue?: string;
  body?: string;
  //noinspection ReservedWordAsName
  static?: boolean;
  //noinspection ReservedWordAsName
  private?: boolean;
  //noinspection ReservedWordAsName
  protected?: boolean;
  //noinspection ReservedWordAsName
  public?: boolean;
  readonly?: boolean;
}
declare interface DTSParsedData {
  className: string;
  parent: string;
  properties: Array<FieldConfig>;
  methods: Array<FieldConfig>;
}
declare interface JSParsedData {
  generatedName: string;
  values: {[fieldName: string]: string;};
  methodBodies: {[fieldName: string]: string;};
  decorators: {[fieldName: string]: Array<Decorator>};
  annotations: {[fieldName: string]: Array<Decorator>};
  src: string;
}
declare interface JSParserOptions {
  definedAnnotations: Array<string>;
  polymerVersion?: boolean;
}
