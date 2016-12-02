/**
 * Return pattern and replacer function to find field level decorators
 *
 * @param decorators List of run-time decorators
 * @param annotations List of design-time annotations
 * @param className Name of the class
 * @param options JSParser options
 *
 * @returns RegExp pattern and replacer function
 */
export declare function getFieldDecorators({decorators, annotations, className, options}: {
    decorators: DecoratorsMap;
    annotations: DecoratorsMap;
    className: string;
    options: JSParserOptions;
}): Replacer;
/**
 * Return pattern and replacer function to find class level decorators
 *
 * @param decorators List of run-time decorators
 * @param annotations List of design-time annotations
 * @param className Name of the class
 * @param generatedName Generated helper name
 * @param options JSParser options
 *
 * @returns RegExp pattern and replacer function
 */
export declare function getClassDecorators({decorators, annotations, className, generatedName, options}: {
    decorators: DecoratorsMap;
    annotations: DecoratorsMap;
    className: string;
    generatedName: string;
    options: JSParserOptions;
}): Replacer;
/**
 * Return pattern and replacer function to find method bodies
 *
 * @param src Parsed source
 * @param methods List of methods config
 * @param isES6
 * @param className Name of the class
 *
 * @returns RegExp pattern and replacer function
 */
export declare function getMethodBodies({src, methods, isES6, className}: {
    src: string;
    methods: FieldConfigMap;
    isES6: boolean;
    className: string;
}): Replacer;
/**
 * Return pattern and replacer function to find default values
 *
 * @param properties List of properties config
 *
 * @returns RegExp pattern and replacer function
 */
export declare function getDefaultValues({properties}: {
    properties: FieldConfigMap;
}): Replacer;
/**
 * Remove __extend helper from ES5
 *
 * @param className Name of the class
 *
 * @returns RegExp pattern and replacer function
 */
export declare function removeExtend({className}: {
    className: string;
}): Replacer;
/**
 * Find class source start index, end index, generated helper name and flag if source is ES6 (class based)
 *
 * @param src String to search
 * @param className Name of the class to find
 *
 * @returns Position of class in source and info is this ES6 class and generated helper name
 */
export declare function findClassBody({src, className}: {
    src: string;
    className: string;
}): PositionInSource & {
    isES6: boolean;
    generatedName: string;
};
/**
 * Find constructor position in source
 *
 * @param src String to search
 * @param className Name of the class to find
 * @param isES6 Flag to indicate if we deal with ES6 class
 * @param classStart Starting position of the class body
 *
 * @returns Position of constructor in source
 */
export declare function findConstructor({src, className, isES6, classStart}: {
    src: string;
    className: string;
    isES6: boolean;
    classStart: number;
}): PositionInSource;
