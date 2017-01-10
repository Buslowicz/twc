declare type Replacer = [ RegExp, string | ((...args: Array<string>) => string) ];
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
  behaviors?: Array<string>;
  styles?: Array<{ type: "link"|"shared"|"inline", style: string }>;
  method?: FieldConfig;
  prop?: PolymerPropertyConfig;
  params?: string;
}
declare interface ConfigBuilderOptions {
  modifiers: Array<string>;
  name: string;
  params?: Array<ParamConfig>;
  type?: string;
  jsDoc?: string;
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
  type?: string;
}
declare interface PropertyConfig {
  name: string;
  modifiers: Array<string>;
  jsDoc: string;
}
declare interface FieldConfig {
  name: string;
  type?: string;
  value?: string;
  isPrimitive?: boolean;
  body?: string;
  params?: Array<ParamConfig>;
  // noinspection ReservedWordAsName
  static?: boolean;
  // noinspection ReservedWordAsName
  private?: boolean;
  // noinspection ReservedWordAsName
  protected?: boolean;
  // noinspection ReservedWordAsName
  public?: boolean;
  readonly?: boolean;
  decorators?: Array<Decorator>;
  annotations?: Array<Decorator>;
  jsDoc?: string;
}
declare interface PolymerPropertyConfig {
  type: string;
  value?: string;
  reflectToAttribute?: boolean;
  readOnly?: boolean;
  notify?: boolean;
  computed?: string;
  observer?: string;

  jsDoc?: string;
}
declare interface JSParserOptions {
  polymerVersion?: number;
  allowDecorators?: boolean;
}
declare interface FilePair {
  js?: File & { contents: Buffer; path: string; };
  ts?: File & { contents: Buffer; path: string; };
}
