import "link!imports/polymer.html";
import "link!imports/esp.html";
export interface ProfileChangeEvent extends CustomEvent {
    detail: {
        /** New profile. */
        newProfile: any;
    };
}
/** Fires whenever ** .. yo! */
export interface SomeEvent extends CustomEvent {
    detail: {
        deep: {
            property: boolean;
        };
        /** New name */
        name: string;
    };
}
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
