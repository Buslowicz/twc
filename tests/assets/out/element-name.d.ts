/// <reference path="../../../types/annotations.d.ts" />
import "link!bower_components/polymer/polymer.html";
import "link!node_modules/easy-polymer/dist/esp.html";
export declare class ElementName {
    greetings: Array<string>;
    readonly test: string;
    profile: any;
    observer(val: string): void;
    observerAuto(greetings: Array<string>): void;
    computedProp(val: string): string;
    computedPropAuto(test: string): string;
}
