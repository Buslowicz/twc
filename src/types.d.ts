declare type Replacer = [RegExp, string | ((...args: Array<string>) => string)];
declare type FieldConfigMap = Map<string, FieldConfig>;

declare interface PositionInSource {
  start: number;
  end: number;
}
declare interface Decorator {
  src: string;
  name: string;
  params: string;
  descriptor?: string;
}
declare interface DecoratorsMap {
  //noinspection ReservedWordAsName
  class?: Array<Decorator>;
  [fieldName: string]: Array<Decorator>;
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
  decorators: Array<Decorator>
  annotations: Array<Decorator>
}
declare interface DTSParsedData {
  className: string;
  parent: string;
  properties: FieldConfigMap;
  methods: FieldConfigMap;
}
declare interface JSParsedData {
  generatedName: string;
  decorators: Array<Decorator>;
  annotations: Array<Decorator>;
  src: string;
  classBody: Array<number>;
}
declare interface JSParserOptions {
  definedAnnotations: Array<string>;
  polymerVersion?: number;
  allowDecorators?: boolean;
}
