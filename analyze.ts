import { readFileSync } from 'fs';
import {
  ClassDeclaration, createSourceFile, EnumDeclaration, FunctionDeclaration, ImportDeclaration, InterfaceDeclaration,
  ModuleDeclaration, ScriptTarget, SourceFile, SyntaxKind, TypeAliasDeclaration, VariableStatement
} from 'typescript';
import { parseDeclarationType, transparentTypes } from './parsers';

const fileName = 'complex.ts';
const content = readFileSync(fileName).toString();
const source: SourceFile = createSourceFile(fileName, content, ScriptTarget.ES2015, false);

/*
 Wrap initializer with function:
 BinaryExpression
 TemplateExpression
 NewExpression
 ObjectLiteralExpression
 ArrayLiteralExpression
 PropertyAccessExpression

 object type

 Do NOT wrap init for:
 FirstTemplateToken
 StringLiteral
 FirstLiteralToken
 TrueKeyword
 FalseKeyword
 NullKeyword
 UndefinedKeyword
 */

const isProperty = (member) => member.kind === SyntaxKind.PropertyDeclaration;
const flattenExpressionTypes = (node) => [
  ...(node.left ? flattenExpressionTypes(node.left) : []),
  ...(node.text || node.kind === SyntaxKind.PropertyAccessExpression ? [ node ] : []),
  ...(node.right ? flattenExpressionTypes(node.right) : [])
];

// function getInitializerWithType(member) {
//   return null;
// }

function getJSType(member) {
  const map = Object.keys(SyntaxKind).filter((key) => isNaN(Number(key)));
  const declarationType = map[ parseDeclarationType(member) ];
  // const initializerWithType = getInitializerWithType(member);
  console.log(member.getFullText().trim(), '>>>', declarationType);
  // const type = (member.type || member.initializer || member).kind || SyntaxKind.TypeLiteral;

}

export function getJSType_orig(member) {
  const type = (member.type || member.initializer || member).kind || SyntaxKind.TypeLiteral;

  switch (type) {
    case SyntaxKind.NumberKeyword:
    case SyntaxKind.FirstLiteralToken:
      return { type: 'Number', wrapInit: false, value: member.initializer && member.initializer.getFullText().trim() };
    case SyntaxKind.BooleanKeyword:
    case SyntaxKind.TrueKeyword:
    case SyntaxKind.FalseKeyword:
      return { type: 'Boolean', wrapInit: 'initializer' in member };
    case SyntaxKind.ArrayType:
    case SyntaxKind.TupleType:
    case SyntaxKind.ArrayLiteralExpression:
      return { type: 'Array', wrapInit: 'initializer' in member };
    case SyntaxKind.StringKeyword:
    case SyntaxKind.StringLiteral:
    case SyntaxKind.TemplateExpression:
    case SyntaxKind.FirstTemplateToken:
      return { type: 'String', wrapInit: 'initializer' in member };
    case SyntaxKind.TypeReference:
    case SyntaxKind.NewExpression:
      const typeName = member.type ? member.type.typeName.text : member.initializer.expression.text;
      if ([ 'Date', 'Array' ].indexOf(typeName) !== -1) {
        return { type: typeName, wrapInit: true };
      }
      break;
    case SyntaxKind.LiteralType:
      return getJSType_orig({ type: member.type.literal });
    case SyntaxKind.UnionType:
    case SyntaxKind.IntersectionType:
      const types = member
        .type
        .types
        .map((t) => t.kind === SyntaxKind.LiteralType ? t.literal : t)
        .filter((t) => transparentTypes.indexOf(t.kind) === -1);
      if (types.length === 1) {
        return getJSType_orig({ type: types[ 0 ] });
      } else {
        const reduced = types.reduce((a, b) => a.kind === b.kind ? a : {});
        return getJSType_orig({ type: reduced });
      }
    case SyntaxKind.BinaryExpression:
      const flat = flattenExpressionTypes(member.initializer);
      const reduced = flat.reduce((a, b) => a.kind === b.kind ? a : {});
      return { type: getJSType_orig({ type: reduced }).type, wrapInit: true };
    default:
      break;
  }
  return 'Object';
}

function buildPropertyDeclaration(member) {
  return getJSType(member);
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
