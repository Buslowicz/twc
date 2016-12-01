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
 * @todo docs
 */
export declare function buildProperty(prop: any): string;
/**
 * Generate a polymer v1 component declaration
 * @todo docs
 */
export declare function buildPolymerV1({className, properties, methods}: {
    className: any;
    properties: any;
    methods: any;
}): string;
