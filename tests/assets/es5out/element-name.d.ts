import "imports/polymer.html";
import "imports/esp.html";
export declare namespace Polymer {
    interface TheBehavior {
        created(): void;
    }
}
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
export interface ElementName extends Polymer.TheBehavior {
}
/**
 * A test class
 *
 * @demo test.html
 */
export declare class ElementName extends Polymer.Element {
    /**
     * A greetings list
     */
    greetings: Array<string>;
    readonly test: string;
    profile: any;
    /**
     * Some static method
     */
    static staticTest(test: string, test2: {
        a: boolean;
        b: any;
    }, test3?: number): void;
    /**
     * Observer method
     */
    observer(val: string): void;
    observerAuto(greetings: Array<string>): void;
    computedProp(val: string): string;
    computedPropAuto(test: string): string;
}
