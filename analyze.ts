import { readFileSync } from 'fs';
import {
  ClassDeclaration, createSourceFile, EnumDeclaration, FunctionDeclaration, ImportDeclaration, InterfaceDeclaration,
  ModuleDeclaration, ScriptTarget, SourceFile, SyntaxKind, TypeAliasDeclaration, VariableStatement
} from 'typescript';
import { getTypeAndValue } from './parsers';

const fileName = 'complex.ts';
const content = readFileSync(fileName).toString();
const source: SourceFile = createSourceFile(fileName, content, ScriptTarget.ES2015, false);

const isProperty = (member) => member.kind === SyntaxKind.PropertyDeclaration;

function buildPropertyDeclaration(member) {
  return getTypeAndValue(member);
}

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
  /*
   render() {
   tpl = classDeclaration.members
   .filter((member) => member.kind === SyntaxKind.MethodDeclaration)[7]
   .body.statements[0].expression;

   return tpl.head.text + tpl
   .templateSpans
   .map(span => `{{${span.expression.getFullText().replace("this.","")}}}${span.literal.text}`)
   .join("");
   }
   */
  console.log('class: ', classDeclaration.name.getText());
  console.log(`${(classDeclaration[ 'jsDoc' ] || []).map((doc) => `${doc.getFullText()}\n`).join('\n') }Polymer({
  ${[
    `is: "${classDeclaration.name.getText()}"`,
    `properties: {${
      classDeclaration.members
        .filter(isProperty)
        .map((member) => `
          ${member.name.getText()}: ${buildPropertyDeclaration(member)}`)
      }
      }`
  ].join(',\n')}
});`);
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
const SyntaxHandler = {
  [SyntaxKind.ImportDeclaration]: parseImport,
  [SyntaxKind.InterfaceDeclaration]: parseInterface,
  [SyntaxKind.ClassDeclaration]: parseClass,
  [SyntaxKind.ModuleDeclaration]: parseModule,
  [SyntaxKind.TypeAliasDeclaration]: parseType,
  [SyntaxKind.VariableStatement]: parseVariable,
  [SyntaxKind.FunctionDeclaration]: parseFunction,
  [SyntaxKind.EnumDeclaration]: parseEnum
};

source.statements.forEach((statement) => {
  if (statement.kind in SyntaxHandler) {
    SyntaxHandler[ statement.kind ].call(null, statement);
  } else {
    console.log('??????? ', SyntaxKind[ statement.kind ]);
  }
});

process.exit(0);
