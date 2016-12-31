import { notify, computed } from "../../annotations/polymer";
export class NotifyComputed {
  prop: string;

  @notify @computed test(prop: string) {
    console.log(prop);
    return "test";
  }
}
