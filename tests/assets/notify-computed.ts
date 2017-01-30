import Polymer, { notify, computed } from "../../annotations/polymer";
export class NotifyComputed extends Polymer.Element {
  prop: string;

  @notify @computed test(prop: string) {
    console.log(prop);
    return "test";
  }
}
