/**
 * @license
 * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

declare interface Window {
  customElements: CustomElementRegistry;
}

declare class CustomElementRegistry {
  define(name: string, definition: { prototype: any }): void;
}

interface Constructor<T> {
  new (...args: any[]): T;
}

/**
 * An interface to match all Objects, but not primitives.
 */
interface Base {}

/**
 * A subclass-factory style mixin that extends `superclass` with a new subclass
 * that implements the interface `M`.
 */
type Mixin<M> =
  <C extends Base>(superclass: Constructor<C>) => Constructor<M & C>;

/**
 * The Polymer function and namespace.
 */
declare var Polymer: {
  /**
   * The "Polymer function" for backwards compatibility with Polymer 1.x.
   */
  (definition: any): void;

  /**
   * A base class for Polymer custom elements that includes the
   * `Polymer.MetaEffects`, `Polymer.BatchedEffects`, `Polymer.PropertyEffects`,
   * etc., mixins.
   */
  Element: PolymerElementConstructor;

  ElementMixin: Mixin<PolymerElement>;

  PropertyEffects: Mixin<PolymerPropertyEffects>;

  BatchedEffects: Mixin<PolymerBatchedEffects>;
};

declare interface PolymerElementConstructor {
  new(): PolymerElement;
}

declare class PolymerElement extends PolymerMetaEffects {
  static readonly template: HTMLTemplateElement;
  static finalized: boolean;

  static finalize(): void;

  ready(): void;

  updateStyles(properties: string[]): void;
}

declare class PolymerHelpers extends HTMLElement {
  $: any;
}

declare class PolymerPropertyEffects extends PolymerHelpers {
  ready(): void;

  linkPaths(to: string, from: string): void;

  unlinkPaths(path: string): void;

  notifySplices(path: string, splices: any[]): void;

  get(path: string | (string | number)[], root: any): any;

  set(path: string | (string | number)[], value: any): void;

  push(path: string, ...items: any[]): any;

  pop(path: string): any;
}

declare class PolymerBatchedEffects extends PolymerPropertyEffects {
  // _propertiesChanged(currentProps, changedProps, oldProps): void;
  // _setPropertyToNodeFromAnnotation(node, prop, value): void;
  // _setPropertyFromNotification(path, value, event): void;
  // _setPropertyFromComputation(prop, value): void;
  // _enqueueClient(client): void;
  // _flushClients(): void;
  setProperties(props: any): void;
}

declare class PolymerMetaEffects extends PolymerBatchedEffects {
  // _clearPropagateEffects(): void;
  // _createPropertyFromInfo(name: string, info): void;
  // _setPropertyDefaults(properties): void;
}
