/// <reference path="../../types/annotations.d.ts"/>

import "link!bower_components/polymer/polymer.html";
import "link!node_modules/easy-polymer/dist/esp.html";

@template(`<h1>tester: [[test]]</h1>`)
export class ElementName {
  @attr greetings: Array<string>;
  readonly test: string = "tester";
  @notify profile: any;

  @observe("profile.prop") observer(val: string) {
    console.log("val:", val);
  }

  @observe observerAuto(greetings: Array<string>) {
    console.log("greetings:", greetings);
  }

  @computed("test") computedProp(val: string) {
    console.log(val);
    return val + "!";
  }

  @computed computedPropAuto(test: string) {
    console.log("test:", test);
    return test + "!";
  }
}
