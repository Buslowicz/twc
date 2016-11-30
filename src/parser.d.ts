export declare type Replacer = [RegExp, string | ((...args: Array<string>) => string)];
export interface Decorator {
    src: string;
    name: string;
    params: string;
    descriptor?: string;
}
export interface FoundMatch {
    index: number;
    found: any;
}
export interface FoundType {
    end: number;
    type: string;
}
export interface ParamConfig {
    name: string;
    type?: string;
}
export interface PropertyConfig {
    name: string;
    modifiers: Array<string>;
}
export interface FieldConfig {
    name: string;
    type: string;
    defaultValue?: string;
    static?: boolean;
    private?: boolean;
    protected?: boolean;
    public?: boolean;
    readonly?: boolean;
}
export interface DTSParsedData {
    className: string;
    parent: string;
    properties: Array<FieldConfig>;
    methods: Array<FieldConfig>;
}
export interface JSParsedData {
    generatedName: string;
    values: {
        [fieldName: string]: string;
    };
    methodBodies: {
        [fieldName: string]: string;
    };
    decorators: {
        [fieldName: string]: Array<Decorator>;
    };
    annotations: {
        [fieldName: string]: Array<Decorator>;
    };
    src: string;
}
export interface JSParserOptions {
    definedAnnotations: Array<string>;
}
/**
 * Works just like indexOf, but skips all kinds of brackets and strings
 *
 * @param src String to search
 * @param term Search term
 * @param offset (Optional) Search offset
 *
 * @returns Index of found character or -1 if not found
 */
export declare function goTo(src: string, term: string | RegExp, offset?: number): number;
/**
 * Splits the string by given term, skips all kinds of brackets and strings
 *
 * @param src String to split
 * @param term Search term (split by this)
 * @param trim (Optional) Should chunks be trimmed
 *
 * @returns List of strings split by searched term
 */
export declare function split(src: string, term: string | RegExp, trim?: boolean): string[];
/**
 * Find index of matching closing bracket
 *
 * @param src String to search
 * @param offset Search offset
 * @param brackets Brackets pair to match (i.e. {}, [], (), <>)
 *
 * @throws SyntaxError - Bracket has no closing
 *
 * @returns Index of found bracket
 */
export declare function findClosing(src: string, offset: number, brackets: string): number;
/**
 * Finds first character that matches the search criteria and returns the found character and index
 *
 * @param src String to search
 * @param term Search term
 * @param offset (Optional) Search offset
 *
 * @returns Found character and index or -1 and null, if nothing was found
 */
export declare function regExpClosestIndexOf(src: string, term: RegExp, offset?: number): FoundMatch;
/**
 * Get modifiers and name of a property or method (does not get types)
 *
 * @param src String to search
 * @param from (Optional) Search from this index
 * @param to (Optional) Search up to this index
 *
 * @returns name and array of property/method modifiers
 */
export declare function getPropertyNoType(src: string, from?: number, to?: number): PropertyConfig;
/**
 * Get type of property, method or param. Inline structures are casted to Object or Array.
 * Combined types are casted to Object. Generic types are stripped.
 *
 * @fixme function interface type ( () => void; )
 *
 * @param src String to search
 * @param offset (Optional) Search offset
 *
 * @returns Found type and index of the END of type declaration or null and -1 if not found
 */
export declare function getType(src: string, offset?: number): FoundType;
/**
 * Convert array to object, using given value (default `true`) as value
 *
 * @param arr Array of strings to convert
 * @param value Value to assign to keys
 *
 * @returns An object with array values as keys and given value as object values
 */
export declare function arrToObject(arr: Array<string>, value?: any): any;
/**
 * Get list of params with their types
 *
 * @param src String to search
 * @param from (Optional) Search from this index
 * @param to (Optional) Search up to this index
 *
 * @returns List of parameter names and types
 */
export declare function parseParams(src: string, from?: number, to?: number): Array<ParamConfig>;
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
 * Parse TypeScript declaration to fetch class name, super class, properties and methods names, types and modifiers
 *
 * @param src String to parse
 *
 * @throws Error if no class was found
 *
 * @returns Class name, super class, properties and methods names, types and modifiers
 */
export declare function parseDTS(src: string): DTSParsedData;
/**
 * Parse JavaScript output to fetch default values, decorators, annotations, generated additional variable name and
 * pre-formatted JavaScript src
 *
 * @todo consider removing default values as an option
 * @todo parse default values using goTo function
 *
 * @param src String to parse
 * @param dtsData Data fetched from TypeScript declaration
 * @param options Options passed to parser
 * @param options.definedAnnotations Available design-time annotations
 *
 * @throws Error if no class was found
 *
 * @returns default values, decorators, annotations, generated additional variable name and pre-formatted JavaScript src
 */
export declare function parseJS(src: string, dtsData: DTSParsedData, options?: JSParserOptions): JSParsedData;
