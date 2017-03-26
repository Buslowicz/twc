declare namespace MathQuill {
  export interface EditableField {
    cmd(command: any): any;
    select(): any;
    latex(): any;
  }

  export function getInterface(version: number): any;
}

declare const component: (name: string) => any;
declare const listen: (name: any) => any;

declare module "bower:esp/esp.html" {
  export const test = "test";
}

declare module "bower:polymer/polymer.html" {
}

declare module "bower:polymer/polymer.html#Polymer" {
  export interface Templatizer {
    templatize(template: any): any;
    stamp(model: any): any;
    modelForElement(el: any): any;
    new(): Templatizer;
  }
}
