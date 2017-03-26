declare type Replacer = [ RegExp, string | ((...args: Array<string>) => string) ];
declare type FieldConfigMap = Map<string, FieldConfig>;

declare interface DefinitionMetaDetails {
  methods: Array<BodyItem>;
  properties: Array<BodyItem>;
  comment?: string;
  // noinspection ReservedWordAsName
  extends: Array<string>;
}
declare interface DefinitionMeta {
  name: string;
  // noinspection ReservedWordAsName
  interface: DefinitionMetaDetails;
  // noinspection ReservedWordAsName
  class: DefinitionMetaDetails;
}
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
  styles?: Array<{ type: "link" | "shared" | "inline", style: string }>;
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
declare interface EventInfo {
  name: string;
  comment: string;
  params: Array<{ name: string; comment: string; type: string; }>;
}
declare interface FieldModifiers {
  // noinspection ReservedWordAsName
  static?: boolean;
  // noinspection ReservedWordAsName
  private?: boolean;
  // noinspection ReservedWordAsName
  protected?: boolean;
  // noinspection ReservedWordAsName
  public?: boolean;
  readonly?: boolean;
}
declare interface FieldConfig extends FieldModifiers {
  name: string;
  type?: string;
  value?: string;
  isPrimitive?: boolean;
  body?: string;
  params?: Array<ParamConfig>;
  decorators?: Array<Decorator>;
  annotations?: Array<Decorator>;
  jsDoc?: string;
}
interface BodyItem extends FieldModifiers {
  name: string;
  isOptional?: boolean;
  comment?: string;
  type?: string;
  params?: Array<{ name: string; type?: string }>;
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
  bowerDir?: string;
  npmDir?: string;
}
declare interface FilePath {
  path: string;
  ns?: string;
  repo: string;
  variable?: string;
}
declare interface FileSources {
  js?: File & { contents: Buffer; path: string; };
  ts?: File & { contents: Buffer; path: string; };
  src?: File & { contents: Buffer; path: string; };
}
