import "link!bower_components/polymer/polymer.html";
import "link!node_modules/easy-polymer/dist/esp.html";
/**
 * A test class
 *
 * @demo test.html
 */
export declare class ElementName {
    /**
     * A greetings list
     */
    greetings: Array<string>;
    readonly test: string;
    profile: any;
    /**
     * Some static method
     */
    static staticTest(): void;
    /**
     * Observer method
     */
    observer(val: string): void;
    observerAuto(greetings: Array<string>): void;
    computedProp(val: string): string;
    computedPropAuto(test: string): string;
}
