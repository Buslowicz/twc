declare type Replacer = [RegExp, string | ((...args: Array<string>) => string)];
declare type DecoratorsMap = {[fieldName: string]: Array<Decorator>};
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
  properties: FieldConfigMap;
  methods: FieldConfigMap;
}
declare interface JSParsedData {
  generatedName: string;
  decorators: DecoratorsMap;
  annotations: DecoratorsMap;
  src: string;
}
declare interface JSParserOptions {
  definedAnnotations: Array<string>;
  polymerVersion?: boolean;
}