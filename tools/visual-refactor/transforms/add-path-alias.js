/**
 * jscodeshift Transform: Add Path Aliases
 * 
 * Converts relative imports to path alias imports.
 * Works with the path aliases defined in tsconfig.json/jsconfig.json
 * 
 * Usage:
 *   jscodeshift -t add-path-alias.js src/
 * 
 * Example:
 *   import { User } from '../../../models/User'
 *   → import { User } from '@models/User'
 */

const path = require('path');

const ALIAS_MAP = {
  '@components': '/src/components',
  '@pages': '/src/pages',
  '@services': '/src/services',
  '@hooks': '/src/hooks',
  '@utils': '/src/utils',
  '@models': '/src/models',
  '@api': '/api',
  '@core': '/core',
  '@modules': '/modules'
};

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let hasChanges = false;

  function shouldTransform(importPath) {
    // Only transform relative imports with ../ 
    return importPath.startsWith('../');
  }

  function getAlias(absolutePath) {
    for (const [alias, basePath] of Object.entries(ALIAS_MAP)) {
      if (absolutePath.startsWith(basePath)) {
        return absolutePath.replace(basePath, alias);
      }
    }
    return null;
  }

  function resolveImportPath(currentFile, relativePath) {
    const currentDir = path.dirname(currentFile);
    const absolutePath = path.resolve(currentDir, relativePath);
    
    // Normalize to project-relative path
    const projectRelative = absolutePath.replace(process.cwd(), '');
    
    return getAlias(projectRelative);
  }

  // Transform ES6 imports
  root
    .find(j.ImportDeclaration)
    .forEach(nodePath => {
      const oldPath = nodePath.value.source.value;
      
      if (shouldTransform(oldPath)) {
        const newPath = resolveImportPath(fileInfo.path, oldPath);
        
        if (newPath) {
          nodePath.value.source.value = newPath;
          hasChanges = true;
          console.log(`  ✓ ${oldPath} → ${newPath}`);
        }
      }
    });

  if (hasChanges) {
    console.log(`✅ Updated path aliases in ${fileInfo.path}`);
  }

  return hasChanges ? root.toSource({ quote: 'single' }) : fileInfo.source;
};
