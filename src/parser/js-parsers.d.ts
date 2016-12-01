/**
 * Get field decorators
 * @todo docs
 */
export declare function fieldDecoratorsAnalyzer({definedAnnotations, decorators, annotations, className}: {
    definedAnnotations: any;
    decorators: any;
    annotations: any;
    className: any;
}): Replacer;
/**
 * Get class decorators
 * @todo docs
 */
export declare function classDecoratorsAnalyzer({definedAnnotations, decorators, annotations, className, generatedName}: {
    definedAnnotations: any;
    decorators: any;
    annotations: any;
    className: any;
    generatedName: any;
}): Replacer;
/**
 * Get method bodies
 * @todo docs
 */
export declare function methodsAnalyzer({src, methodBodies, methods, isES6, className}: {
    src: any;
    methodBodies: any;
    methods: any;
    isES6: any;
    className: any;
}): Replacer;
/**
 * Get default values
 * @todo docs
 */
export declare function defaultValueAnalyzer({properties, values}: {
    properties: any;
    values: any;
}): Replacer;
/**
 * Remove __extend helper from ES5
 * @todo docs
 */
export declare function removeExtend({className}: {
    className: any;
}): Replacer;
/**
 * Find class source start index, end index, generated helper name and flag if source is ES6 (class based)
 * @todo docs
 */
export declare function findClassBody({src, className}: {
    src: any;
    className: any;
}): {
    isES6: boolean;
    start: number;
    end: number;
    generatedName: string;
};
/**
 * Find constructor position
 * @todo docs
 */
export declare function findConstructor({isES6, className, src, classStart}: {
    isES6: any;
    className: any;
    src: any;
    classStart: any;
}): {
    start: number;
    end: number;
};
