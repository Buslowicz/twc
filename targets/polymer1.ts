import { kebabCase } from 'lodash';
import { ModuleKind, Statement, transpileModule } from 'typescript';
import { Component, Import, ImportedNode, Method, Module } from '../builder';
import { updateImportedRefs } from '../helpers';

export class Polymer1 {
  private static lifecycleMap = {
    attributeChangedCallback: 'attributeChanged',
    connectedCallback: 'attached',
    constructor: 'created',
    disconnectedCallback: 'detached'
  };

  private get component(): Component {
    return this.module.statements.find((statement) => statement instanceof Component) || this.module.statements
        .filter((statement) => statement instanceof Component || statement instanceof Module)
        .reduce((all, statement) => all.concat(statement instanceof Module ? statement.components : statement), [])
        .find((statement) => statement instanceof Component);
  }

  private get imports(): Array<Import> {
    const imports = [];
    for (let node = this.module; node; node = node.parent) {
      imports.push(...node.imports);
    }
    return imports;
  }

  private get importedRefs(): Map<string, ImportedNode> {
    const importedRefs = new Map();
    for (let node = this.module; node; node = node.parent) {
      node.imports
        .map((mod) => mod.imports)
        .reduce((all, curr) => all.concat(curr), [])
        .forEach((member) => importedRefs.set(member.identifier, member));
    }
    return importedRefs;
  }

  constructor(private module: Module) {
    const component = this.component;
    if (component && component.heritage && component.heritage !== 'Polymer.Element') {
      throw new SyntaxError('Components in Polymer v1 can only extend `Polymer.Element` class.');
    }
  }

  public toString(): string {
    if (this.module.parent) {
      return `namespace ${this.module.name} {\n${this.statements()}\n}`;
    } else {
      return this.domModule();
    }
  }

  private statements(module = this.module) {
    return module.statements
      .filter((statement) => !(statement instanceof Import))
      .map((statement: Statement) => {
        if (statement instanceof Module) {
          return statement.toString();
        } else if (statement instanceof Component) {
          return this.componentScript(statement);
        } else {
          const updatedStatement = updateImportedRefs(statement, this.importedRefs);
          return this.module.parent ? updatedStatement : updatedStatement.replace(/^(\s*)(export (default )?)/, '$1');
        }
      })
      .join('\n');
  }

  private domModule() {
    return `
      ${this.imports.join('\n')}
      <dom-module is="${kebabCase(this.component.name)}">${
      this.component.template ?
        `<template>
          ${this.component.styles.join('\n')}
          ${this.component.template}
        </template>` : ''}
        <script>
          ${transpileModule(this.statements(), { compilerOptions: { module: ModuleKind.ES2015 } }).outputText}
        </script>
      </dom-module>`;
  }

  private componentScript(component: Component) {
    return `
      const ${component.name} = Polymer({\n${
      component.events.join('\n')
      }${[
      `is: "${kebabCase(component.name)}"`,
      this.behaviors(component),
      this.observers(component),
      this.properties(component),
      ...this.methods(component)
    ].filter((chunk) => !!chunk).join(',\n')}
      });
      ${this.staticMethods(component).join('\n')}
      ${this.staticProperties(component).join('\n')}
    `;
  }

  private behaviors(component: Component) {
    return component.behaviors.length === 0 ? '' : `behaviors: [
      ${component.behaviors.map((behavior) => `"${behavior}"`).join(',\n')}
    ]`;
  }

  private observers(component: Component) {
    return component.observers.length === 0 ? '' : `observers: [
      ${component.observers.map((observer) => `"${observer}"`).join(',\n')}
    ]`;
  }

  private properties(component: Component) {
    return component.properties.size === 0 ? '' : `properties: {
      ${Array.from(component.properties.values(), (prop) => `${prop.provideRefs(this.importedRefs)}`).join(',\n')}
    }`;
  }

  private methods(component: Component) {
    return Array
      .from(component.methods.values())
      .map((m) => m.name in Polymer1.lifecycleMap ? new Method(m.declaration, Polymer1.lifecycleMap[ m.name ]) : m)
      .map((m) => `${m.provideRefs(this.importedRefs, true)}`);
  }

  private staticProperties(component: Component) {
    return Array
      .from(component.staticProperties.values())
      .map((prop) => `${component.name}.${prop.provideRefs(this.importedRefs)};`);
  }

  private staticMethods(component: Component) {
    return Array
      .from(component.staticMethods.values())
      .map((method) => `${component.name}.${method.provideRefs(this.importedRefs)};`);
  }
}
