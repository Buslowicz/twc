declare namespace Polymer {
  export interface BaseClass extends HTMLElement {
    new (): BaseClass;
    is: string;
    $: any;
    register(): void;
  }

  // tslint:disable-next-line
  export let Element: BaseClass;
}

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
