import { kebabCase } from 'lodash';
import { ModuleKind, Statement, transpileModule } from 'typescript';
import { Component, Import, Method, Module } from './builder';
import { updateImportedRefs } from './helpers';
export function polymer1(this: Module) {
  const lifecycleMap = {
    attributeChangedCallback: 'attributeChanged',
    connectedCallback: 'attached',
    constructor: 'created',
    disconnectedCallback: 'detached'
  };

  const component = this.statements
    .filter((statement) => statement instanceof Component || statement instanceof Module)
    .reduce((all, statement) => all.concat(statement instanceof Module ? statement.components : statement), [])
    .find((statement) => statement instanceof Component) as Component;

  if (component && component.heritage && component.heritage !== 'Polymer.Element') {
    throw new SyntaxError('Components in Polymer v1 can only extend `Polymer.Element` class.');
  }

  const importedRefs = new Map();
  const imports = [];
  for (let node = this; node; node = node.parent) {
    imports.push(...node.imports);
    node.imports
      .map((mod) => mod.imports)
      .reduce((all, curr) => all.concat(curr), [])
      .forEach((member) => importedRefs.set(member.identifier, member));
  }

  const printImports = () => imports.map((statement: Import) => statement.toHTML()).join('\n');

  const printStatements = () => this.statements
    .filter((statement) => !(statement instanceof Import))
    .map((statement: Statement) => {
      if (statement instanceof Module) {
        return statement.toString();
      } else if (statement instanceof Component) {
        return printScript(statement);
      } else {
        const updatedStatement = updateImportedRefs(statement, importedRefs);
        return this.parent ? updatedStatement : updatedStatement.replace(/^(\s*)(export (default )?)/, '$1');
      }
    })
    .join('\n');

  const printScript = (comp: Component) => `
      const ${comp.name} = Polymer({\n${
    comp.events.map((event) => `${event}`).join('\n')
    }${[
    `is: "${kebabCase(comp.name)}"`,
    comp.properties.size > 0 ? `properties: {
      ${Array.from(comp.properties.values(), (prop) => `${prop.provideRefs(importedRefs)}`).join(',\n')}
      }` : '',
    comp.observers.length > 0 ? `observers: [
      ${comp.observers.map((observer) => `"${observer}"`).join(',\n')}
      ]` : '',
    comp.behaviors.length > 0 ? `behaviors: [
      ${comp.behaviors.map((behavior) => `"${behavior}"`).join(',\n')}
      ]` : '',
    ...Array.from(comp.methods.values())
      .map((method) => method.name in lifecycleMap ? new Method(method.declaration, lifecycleMap[ method.name ]) : method)
      .map((method) => `${method.provideRefs(importedRefs, true)}`)
  ].filter((chunk) => !!chunk).join(',\n')}
      });
      ${ Array.from(comp.staticMethods.values()).map((method) => `${comp.name}.${method.provideRefs(importedRefs)};`).join('\n') }
      ${ Array.from(comp.staticProperties.values()).map((prop) => `${comp.name}.${prop.provideRefs(importedRefs)};`).join('\n') }
    `;

  const printDomModule = () => `
      <dom-module is="${kebabCase(component.name)}">${
    component.template ?
      `<template>
          ${component.styles.join('\n')}
          ${component.template}
        </template>` : ''}
        <script>
          ${transpileModule(printStatements(), { compilerOptions: { module: ModuleKind.ES2015 } }).outputText}
        </script>
      </dom-module>`;

  return `
      ${this.parent ? `namespace ${this.name} {\n${printStatements()}\n}` : printImports() + printDomModule()}
    `;
}
