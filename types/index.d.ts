/// <reference path="polymer.d.ts"/>
/// <reference path="polymer.decorators.d.ts"/>

export interface Constructor<T = {}> {
  new (...args: any[]): T;
}
