import { readFileSync, writeFileSync } from 'fs';
import { createSourceFile, ScriptTarget, SourceFile } from 'typescript';
import { Module } from './builder';

describe('analyzer', () => {
  it('should analyze the source file and build the proper output', () => {
    const fileName = 'samples/complex.ts';
    const content = readFileSync(fileName).toString();
    const source: SourceFile = createSourceFile(fileName, content, ScriptTarget.ES2015, true);

    writeFileSync('test.html', new Module(source, 'polymer1'));
  });
});
