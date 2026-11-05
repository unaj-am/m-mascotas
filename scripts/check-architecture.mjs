import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve('src');
const errors = [];
function check(file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text;
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require') && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text;
    if (specifier) {
      const target = specifier.startsWith('@/') ? specifier.slice(2) :
        specifier.startsWith('.') ? path.relative(root, path.resolve(path.dirname(file), specifier)).replaceAll('\\', '/') : null;
      const domain = relative.includes('/domain/');
      const presentation = relative.includes('/presentation/') || relative.startsWith('app/');
      const infra = /^(firebase|@react-native-firebase\/|expo(?:-|\/|$)|react(?:-|\/|$)|zustand)/.test(specifier);
      if (domain && (!target || !(target.includes('/domain/') || target.startsWith('shared/')))) errors.push(relative + ': Domain importa ' + specifier);
      if (relative.startsWith('shared/') && (!target || !target.startsWith('shared/'))) errors.push(relative + ': shared importa ' + specifier);
      if (presentation && ((target && target.includes('/data/')) || /^(firebase|@react-native-firebase)/.test(specifier))) errors.push(relative + ': Presentation importa Data/Firebase: ' + specifier);
      if (relative.includes('/data/') && target?.includes('/presentation/')) errors.push(relative + ': Data importa Presentation: ' + specifier);
      if (relative.startsWith('core/') && target?.startsWith('features/')) errors.push(relative + ': core depende de una funcionalidad: ' + specifier);
      if (domain && infra) errors.push(relative + ': dependencia de framework: ' + specifier);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(file)) check(file);
  }
}
walk(root);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Arquitectura válida: Domain puro; Presentation sin Data ni Firebase.');
