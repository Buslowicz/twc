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
 * Template string tag to return empty string if param is an empty array
 *
 * @param stringsArray List of template string constants
 * @param param List of params passed to template string
 *
 * @returns Built template string or empty string if params list is empty
 */
export declare function nonEmpty(stringsArray: TemplateStringsArray, param: Array<string>): string;
