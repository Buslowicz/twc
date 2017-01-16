import { template, style, behavior, attr, notify, observe, computed } from "../../annotations/polymer";
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
      property: boolean
    };
    /** New name */
    name: string;
  };
}

/**
 * A behavior
 */
const myBehavior = {
  test() {
    console.log("behavior test");
  }
};

/**
 * A test class
 *
 * @demo test.html
 */
@template("template.element-name.html")
@style("h1 {color: red;}")
@style("style.css")
@style("shared-style")
@behavior(myBehavior)
export class ElementName {
  /**
   * A greetings list
   */
  @attr greetings: Array<string>;
  readonly test: string = "tester";
  @notify profile: any;

  /**
   * Some static method
   */
  static staticTest() {
    console.log("static");
  }

  /**
   * Observer method
   */
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
