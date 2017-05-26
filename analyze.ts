import { readFileSync } from 'fs';
import {
  ClassDeclaration, createSourceFile, EnumDeclaration, FunctionDeclaration, ImportDeclaration, InterfaceDeclaration, ModuleDeclaration,
  ScriptTarget, SourceFile, SyntaxKind, TypeAliasDeclaration, VariableStatement
} from 'typescript';
import { Component } from './builder';
// import { getTypeAndValue } from './parsers';

const fileName = 'complex.ts';
const content = readFileSync(fileName).toString();
const source: SourceFile = createSourceFile(fileName, content, ScriptTarget.ES2015, false);

// const isProperty = (member) => member.kind === SyntaxKind.PropertyDeclaration;

// function buildPropertyDeclaration(member) {
//   return getTypeAndValue(member);
// }

function parseImport(importDeclaration: ImportDeclaration) {
  const path = importDeclaration.moduleSpecifier.getText().slice(1, -1);
  const mod = path.match(/(?:(bower|npm):)?([^#]+)(?:#([\w$]+))?/);
  const ext = (mod[ 2 ].match(/\.(html|js)$/) || [])[ 1 ];
  const ns = mod[ 3 ] ? ` using ${mod[ 3 ]} namespace` : '';
  const repo = mod[ 1 ] ? ` from ${mod[ 1 ]} repo` : '';
  console.log(`${ext ? `${ext} ` : ''}importing ${mod[ 2 ]}${repo}${ns}`);
  if (importDeclaration.importClause) {
    console.log('---', importDeclaration.importClause.namedBindings.getText());
  }
}
function parseInterface(interfaceDeclaration: InterfaceDeclaration) {
  console.log('interface: ', interfaceDeclaration.name.getText());
}
function parseClass(classDeclaration: ClassDeclaration) {
  return new Component(classDeclaration);
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

/* tslint:disable:variable-name */
// const SyntaxHandler = {
//   [SyntaxKind.ImportDeclaration]: parseImport,
//   [SyntaxKind.InterfaceDeclaration]: parseInterface,
//   [SyntaxKind.ClassDeclaration]: parseClass,
//   [SyntaxKind.ModuleDeclaration]: parseModule,
//   [SyntaxKind.TypeAliasDeclaration]: parseType,
//   [SyntaxKind.VariableStatement]: parseVariable,
//   [SyntaxKind.FunctionDeclaration]: parseFunction,
//   [SyntaxKind.EnumDeclaration]: parseEnum
// };

// const statements = new Map<string, any>();

source.statements.forEach((statement) => {
  switch (statement.kind) {
    case SyntaxKind.ImportDeclaration:
      parseImport(statement as ImportDeclaration);
      break;
    case SyntaxKind.InterfaceDeclaration:
      parseInterface(statement as InterfaceDeclaration);
      break;
    case SyntaxKind.ClassDeclaration:
      parseClass(statement as ClassDeclaration);
      break;
    case SyntaxKind.ModuleDeclaration:
      parseModule(statement as ModuleDeclaration);
      break;
    case SyntaxKind.TypeAliasDeclaration:
      parseType(statement as TypeAliasDeclaration);
      break;
    case SyntaxKind.VariableStatement:
      parseVariable(statement as VariableStatement);
      break;
    case SyntaxKind.FunctionDeclaration:
      parseFunction(statement as FunctionDeclaration);
      break;
    case SyntaxKind.EnumDeclaration:
      parseEnum(statement as EnumDeclaration);
      break;
    default:
      console.log('??????? ', SyntaxKind[ statement.kind ]);
  }
  // if (statement.kind in SyntaxHandler) {
  //   SyntaxHandler[ statement.kind ].call(null, statement);
  // } else {
  //   console.log('??????? ', SyntaxKind[ statement.kind ]);
  // }
});

process.exit(0);
