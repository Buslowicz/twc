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
declare interface AnnotationOptions {
  properties?: FieldConfigMap;
  methods?: FieldConfigMap;
  config?: FieldConfig;
  propertiesMap?: Map<string, PolymerPropertyConfig>;
  methodsMap?: FieldConfigMap;
  observers?: Array<string>;
  method?: FieldConfig;
  prop?: PolymerPropertyConfig;
  params?: string;
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
  type?: string;
  value?: string;
  isPrimitive?: boolean;
  body?: string;
  params?: Array<ParamConfig>;
  //noinspection ReservedWordAsName
  static?: boolean;
  //noinspection ReservedWordAsName
  private?: boolean;
  //noinspection ReservedWordAsName
  protected?: boolean;
  //noinspection ReservedWordAsName
  public?: boolean;
  readonly?: boolean;
  decorators?: Array<Decorator>
  annotations?: Array<Decorator>
}
declare interface PolymerPropertyConfig {
  type: string;
  value?: string;
  reflectToAttribute?: boolean;
  readOnly?: boolean;
  notify?: boolean;
  computed?: string;
  observer?: string;
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
  polymerVersion?: number;
  allowDecorators?: boolean;
}
