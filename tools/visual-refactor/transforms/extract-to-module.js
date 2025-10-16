/**
 * jscodeshift Transform: Extract to Module
 * 
 * Extracts components/functions to a new module structure.
 * Useful for converting monolithic files to modular architecture.
 * 
 * Usage:
 *   jscodeshift -t extract-to-module.js src/
 * 
 * Options:
 *   --module=<module-name>  Target module (e.g., 'auth', 'payments')
 */

module.exports = function transformer(fileInfo, api, options) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const { module: targetModule } = options;

  let extractedExports = [];

  // Find named exports
  root
    .find(j.ExportNamedDeclaration)
    .forEach(path => {
      const declaration = path.value.declaration;
      
      if (declaration) {
        if (declaration.type === 'FunctionDeclaration' && declaration.id) {
          extractedExports.push({
            type: 'function',
            name: declaration.id.name
          });
        } else if (declaration.type === 'VariableDeclaration') {
          declaration.declarations.forEach(decl => {
            if (decl.id.type === 'Identifier') {
              extractedExports.push({
                type: 'variable',
                name: decl.id.name
              });
            }
          });
        }
      }
    });

  // Find default export
  root
    .find(j.ExportDefaultDeclaration)
    .forEach(path => {
      const declaration = path.value.declaration;
      
      if (declaration.type === 'Identifier') {
        extractedExports.push({
          type: 'default',
          name: declaration.name
        });
      } else if (declaration.type === 'FunctionDeclaration' && declaration.id) {
        extractedExports.push({
          type: 'default',
          name: declaration.id.name
        });
      }
    });

  if (extractedExports.length > 0 && targetModule) {
    console.log(`\n📦 Extracting to module: ${targetModule}`);
    console.log(`   From: ${fileInfo.path}`);
    console.log(`   Exports found: ${extractedExports.map(e => e.name).join(', ')}`);
    
    // Generate module barrel export
    const barrelExport = generateBarrelExport(extractedExports, fileInfo.path);
    console.log(`\n   Add to modules/${targetModule}/index.ts:`);
    console.log(`   ${barrelExport}`);
  }

  return fileInfo.source;
};

function generateBarrelExport(exports, sourcePath) {
  const relativePath = sourcePath.replace(/^.*\/src\//, './');
  const lines = [];
  
  exports.forEach(exp => {
    if (exp.type === 'default') {
      lines.push(`export { default as ${exp.name} } from '${relativePath}';`);
    } else {
      lines.push(`export { ${exp.name} } from '${relativePath}';`);
    }
  });
  
  return lines.join('\n');
}
