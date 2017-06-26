import { test } from "bower:esp/esp.html";
import { Templatizer } from "bower:polymer/polymer.html#Polymer";
import { attr, compute, CustomElement, notify, observe, style, template } from "twc/polymer";

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
      property: boolean
    };
    /** New name */
    name: string;
  };
}

export interface ElementName extends Templatizer {}

/**
 * A test class
 *
 * @demo test.html
 */
@CustomElement()
@template("template.element-name.html")
@style("h1 {color: red;}", "style.css", "shared-style")
export class ElementName extends Polymer.Element {
  /**
   * Some static method
   */
  public static staticTest(test: string, test2: { a: boolean, b: any }, test3?: number) {
    console.log("static");
  }

  /**
   * A greetings list
   */
  @attr() public greetings: Array<string>;
  public readonly test: string = "tester";
  @notify() public profile: any;

  @compute((val: string) => val + "!", [ "test" ]) public computedProp: string;
  @compute((test: string) => test + "!") public computedPropAuto;

  /**
   * Observer method
   */
  @observe("profile.prop")
  public observer(val: string) {
    console.log("val:", val);
  }

  @observe()
  public observerAuto(greetings: Array<string>) {
    console.log("greetings:", greetings);
  }

  public externalDependency() {
    return test;
  }
}
