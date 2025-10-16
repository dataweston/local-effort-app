/**
 * jscodeshift Transform: Update Import Paths
 * 
 * This transform updates import paths when files are moved during
 * architecture refactoring.
 * 
 * Usage:
 *   jscodeshift -t update-imports.js src/
 * 
 * Options:
 *   --from=<old-path>  Old base path (e.g., '../models')
 *   --to=<new-path>    New base path (e.g., '@core/models')
 */

module.exports = function transformer(fileInfo, api, options) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const { from, to } = options;

  if (!from || !to) {
    console.warn('⚠️  Please provide --from and --to options');
    return fileInfo.source;
  }

  let hasChanges = false;

  // Transform ES6 imports
  root
    .find(j.ImportDeclaration)
    .forEach(path => {
      const oldPath = path.value.source.value;
      
      if (oldPath.includes(from)) {
        const newPath = oldPath.replace(from, to);
        path.value.source.value = newPath;
        hasChanges = true;
        console.log(`  ✓ ${oldPath} → ${newPath}`);
      }
    });

  // Transform require statements
  root
    .find(j.CallExpression, {
      callee: { name: 'require' }
    })
    .forEach(path => {
      const arg = path.value.arguments[0];
      if (arg && arg.type === 'Literal') {
        const oldPath = arg.value;
        
        if (oldPath.includes(from)) {
          const newPath = oldPath.replace(from, to);
          arg.value = newPath;
          hasChanges = true;
          console.log(`  ✓ require('${oldPath}') → require('${newPath}')`);
        }
      }
    });

  // Transform dynamic imports
  root
    .find(j.CallExpression, {
      callee: { type: 'Import' }
    })
    .forEach(path => {
      const arg = path.value.arguments[0];
      if (arg && arg.type === 'Literal') {
        const oldPath = arg.value;
        
        if (oldPath.includes(from)) {
          const newPath = oldPath.replace(from, to);
          arg.value = newPath;
          hasChanges = true;
          console.log(`  ✓ import('${oldPath}') → import('${newPath}')`);
        }
      }
    });

  if (hasChanges) {
    console.log(`✅ Updated imports in ${fileInfo.path}`);
  }

  return hasChanges ? root.toSource({ quote: 'single' }) : fileInfo.source;
};
