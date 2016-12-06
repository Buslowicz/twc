/// <reference path="../../types/annotations.d.ts"/>
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import "link!bower_components/polymer/polymer.html";
import "link!node_modules/easy-polymer/dist/esp.html";
let ElementName = class ElementName {
    constructor() {
        this.test = "tester";
    }
    observer(val) {
        console.log("val:", val);
    }
    observerAuto(greetings) {
        console.log("greetings:", greetings);
    }
    computedProp(val) {
        console.log(val);
        return val + "!";
    }
    computedPropAuto(test) {
        console.log("test:", test);
        return test + "!";
    }
};
__decorate([
    attr
], ElementName.prototype, "greetings", void 0);
__decorate([
    notify
], ElementName.prototype, "profile", void 0);
__decorate([
    observe("profile.prop")
], ElementName.prototype, "observer", null);
__decorate([
    observe
], ElementName.prototype, "observerAuto", null);
__decorate([
    computed("test")
], ElementName.prototype, "computedProp", null);
__decorate([
    computed
], ElementName.prototype, "computedPropAuto", null);
ElementName = __decorate([
    template(`<h1>tester: [[test]]</h1>`)
], ElementName);
export { ElementName };
