/**
 * Build a full property config
 *
 * @param mods List of field modifiers
 * @param name Property/method name
 * @param params List of parameters (names and types)
 * @param type Type of field
 *
 * @returns Field configuration object
 */
export declare function buildField(mods: Array<string>, name: string, params?: Array<ParamConfig>, type?: string): FieldConfig;
/**
 * Build a Polymer property config
 *
 * @param prop Property configuration
 *
 * @returns String representation of property config object
 */
export declare function buildProperty(prop: FieldConfig): string;
/**
 * Generate a Polymer v1 component declaration
 *
 * @param className Name of the component
 * @param properties Component properties list
 * @param methods Component methods list
 *
 * @returns String representation of polymer component declaration
 */
export declare function buildPolymerV1(className: string, properties: FieldConfigMap, methods: FieldConfigMap): string;
