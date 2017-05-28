import { test as T1, test2 } from 'bower:esp/esp.html';
import * as esp2 from 'bower:esp/esp2.html';
import { Templatizer } from 'bower:polymer/polymer.html#Polymer';
import { attr, behavior, compute, notify, observe, style } from 'twc/polymer';
import './assets/test';

namespace Polymer {
  export interface TheBehavior {
    created(): void;
  }
}

let A = '20';

export const CONST = true;

declare const window: any;

declare const CONST2 = 'types';

declare const enum ENUM { A, B, C }

type primitive = string | number | boolean | null | undefined;

interface CustomEvent {
  detail: any;
}

A = '25';

function testFun(slot, orientation = 'X') {
  let transform: primitive;
  const { width, height } = slot.itemSize;
  if (orientation === 'X') {
    transform = `translate(${slot.index * width}px, ${slot.col * height}px)`;
  } else {
    transform = `translate(${slot.col * width}px, ${slot.index * height}px)`;
  }
  return { transform, 'width.px': width, 'height.px': height };
}

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
    console.log('behavior test');
  }
};

/* tslint:disable:array-type */
class X {
  public unionTest1: boolean | number | string | null | undefined | object | never | void | any | Date | 'test' | 5 | { a: string }
    | [ number, string, boolean ] | Array<any>;
  public unionTest2: boolean & number & string & null & undefined & object & never & void & any & Date & 'test' & 5 & { a: string }
    & [ number, string, boolean ] & Array<any>;
  public empty;
  public st1: string;
  public st2 = 'test';
  public st3 = 'test' + 'test';
  public st4 = `${25}`;
  public st5 = `test`;
  public st6: string = null;
  public st7: 'test';
  public st8: 'test1' | 'test2';
  public nm1: number;
  public nm2 = 10;
  public nm3 = 5 * 5 * 5;
  public nm4 = 5 * window.innerWidth;
  public nm5: number = 5 * window.innerWidth;
  public bo1: boolean;
  public bo2 = true;
  public bo3 = (window && window.opener);
  public dt1: Date;
  public dt2 = new Date();
  public lt1: { a: boolean, b: string };
  public lt2 = { a: true, b: 'test' };
  public ar1: Array<boolean>;
  public ar2: [ boolean ];
  public ar3: boolean[];
  public ar4 = [ 1, 2, 3 ];
  public ar5 = new Array(10);
  public tp1: [ string, number ];
  public tp2: [ string, number ] = [ 'a', 10 ];
  //noinspection TsLint
  public obj1: Object;
  public obj2: object;
  public nul: null;
  public und: undefined;
  public any: any;
  public voi: void;
  public nev: never;
  public cus: PolymerElement;
  public enm: ENUM;
  public en2 = ENUM.A;

  public un1: string | null;
  public un2: string | number;
  //noinspection TsLint
  public un3: Date & Object;

  public fn1: () => string;
  public fn2 = () => 'test';
}

export interface ElementName extends Polymer.TheBehavior, Templatizer {}

/* tslint:disable:max-classes-per-file */
/**
 * A test class
 * So awesome
 *
 * @demo test.html
 */
@style('h1 {color: red;}', 'style.css', 'shared-style')
@behavior(myBehavior)
export class ElementName extends Polymer.Element {
  /**
   * Some static method
   */
  public static staticTest(test: string, test2: { a: boolean, b: any }, test3?: number) {
    console.log('static');
  }

  @compute((st1, st2) => st1 + st2) public computedProp: string;

  /**
   * A greetings list
   */
  @attr public greetings: Array<string>;
  public readonly test: string = 'tester';
  @notify public profile: any;

  /**
   * Observer method
   */
  @observe('profile.prop')
  public observer(val: string) {
    console.log('val:', val);
  }

  @observe
  public observerAuto(greetings: Array<string>) {
    console.log('greetings:', greetings);
  }

  @observe
  public observerAutoMulti(greetings: Array<string>, profile: object) {
    console.log('greetings:', greetings, profile);
  }

  public externalDependency() {
    testFun({ CONST2, ENUM: ENUM.A, A });
    console.log(esp2);
    return T1 + test2;
  }

  public testFun(slot, orientation = 'X') {
    let transform: primitive | X;
    const { width, height } = slot.itemSize;
    if (orientation === 'X') {
      transform = `translate(${slot.index * width}px, ${slot.col * height}px)`;
    } else {
      transform = `translate(${slot.col * width}px, ${slot.index * height}px)`;
    }
    return { transform, 'width.px': width, 'height.px': height };
  }

  public template() {
    return `
      <dom-if if="${this.test}">
        <h1>${this.test}</h1>
      </dom-if>
      <dom-if if="${!this.test}">
        <h1>Yo</h1>
      </dom-if>
      <p>${this.testFun({})}</p>
    `;
  }
}
