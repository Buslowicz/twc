import { expect } from 'chai';
import { readFileSync } from 'fs';
import {
  ClassDeclaration, createSourceFile, EnumDeclaration, FunctionDeclaration, ImportDeclaration, InterfaceDeclaration, ModuleDeclaration,
  ScriptTarget, SourceFile, SyntaxKind, TypeAliasDeclaration, VariableStatement
} from 'typescript';
import { Component, Import } from './builder';
import { inheritsFrom } from './helpers';

function parseInterface(interfaceDeclaration: InterfaceDeclaration) {
  console.log('interface: ', interfaceDeclaration.name.getText());
}
function parseModule(moduleDeclaration: ModuleDeclaration) {
  console.log('module: ', moduleDeclaration.name.getText());
}
function parseType(typeAliasDeclaration: TypeAliasDeclaration) {
  console.log('type: ', typeAliasDeclaration.name.getText());
}
function parseVariable(variableStatement: VariableStatement) {
  console.log('Variables: ', variableStatement.declarationList.declarations.map((d) => d.name.getText()));
}
function parseFunction(functionDeclaration: FunctionDeclaration) {
  console.log('Function: ', functionDeclaration.name.getText());
}
function parseEnum(enumDeclaration: EnumDeclaration) {
  console.log('Enum: ', enumDeclaration.name.getText());
}

function parseStatements(source: SourceFile) {
  const statements = [];
  const variables = new Map<string, any>();

  source.statements.forEach((statement) => {
    switch (statement.kind) {
      case SyntaxKind.ImportDeclaration:
        const declaration = new Import(statement as ImportDeclaration);
        statements.push(statement);
        declaration.imports.forEach((imp) => variables.set(imp.fullIdentifier, imp));
        break;
      case SyntaxKind.InterfaceDeclaration:
        statements.push(statement);
        parseInterface(statement as InterfaceDeclaration);
        break;
      case SyntaxKind.ClassDeclaration:
        if (inheritsFrom(statement as ClassDeclaration, 'Polymer.Element')) {
          const component = new Component(statement as ClassDeclaration);
          statements.push(component);
          variables.set(component.name, component);
        } else {
          statements.push(statement);
        }
        break;
      case SyntaxKind.ModuleDeclaration:
        statements.push(statement);
        parseModule(statement as ModuleDeclaration);
        break;
      case SyntaxKind.TypeAliasDeclaration:
        statements.push(statement);
        parseType(statement as TypeAliasDeclaration);
        break;
      case SyntaxKind.VariableStatement:
        statements.push(statement);
        parseVariable(statement as VariableStatement);
        break;
      case SyntaxKind.FunctionDeclaration:
        statements.push(statement);
        parseFunction(statement as FunctionDeclaration);
        break;
      case SyntaxKind.EnumDeclaration:
        statements.push(statement);
        parseEnum(statement as EnumDeclaration);
        break;
      default:
        statements.push(statement);
        console.log('??????? ', SyntaxKind[ statement.kind ]);
    }
  });
  return { statements, variables };
}

describe('analyzer', () => {
  it('should analyze the source file and build the proper output', () => {
    const fileName = 'complex.ts';
    const content = readFileSync(fileName).toString();
    const source: SourceFile = createSourceFile(fileName, content, ScriptTarget.ES2015, true);

    const { statements, variables } = parseStatements(source);

    console.log({ statements, variables });

    expect(Array.from(statements)).to.have.lengthOf(1);
  });
});
