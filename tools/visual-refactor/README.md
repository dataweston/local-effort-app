# 🎨 Visual Architecture Transformer

A lightweight proof-of-concept for visually transforming your codebase architecture using jscodeshift.

## 🚀 Quick Start

```bash
cd tools/visual-refactor
pnpm install
pnpm start
```

Then open http://localhost:3333 in your browser.

## 🎯 What It Does

This tool demonstrates how visual architecture transformations can be mapped to actual code changes:

1. **Choose a Shape** - Select from different architectural patterns (circular, layered, modular, etc.)
2. **Preview Changes** - See the transformation plan with file movements and code changes
3. **Generate Script** - Get a bash script with all the transformation commands
4. **Apply Transform** - Execute jscodeshift transformations to update your code

## 🔧 Available Transforms

### 1. Update Imports (`update-imports.js`)

Updates import paths when files are moved.

```bash
jscodeshift -t transforms/update-imports.js src/ \
  --from='../models' \
  --to='@core/models'
```

**Example:**
```js
// Before
import { User } from '../models/User';

// After
import { User } from '@core/models/User';
```

### 2. Extract to Module (`extract-to-module.js`)

Helps convert monolithic code to modular architecture.

```bash
jscodeshift -t transforms/extract-to-module.js src/ \
  --module='auth'
```

### 3. Add Path Aliases (`add-path-alias.js`)

Converts relative imports to path aliases.

```bash
jscodeshift -t transforms/add-path-alias.js src/
```

**Example:**
```js
// Before
import { Button } from '../../../components/Button';

// After
import { Button } from '@components/Button';
```

## 📐 Architectural Patterns

### Circular Flow
- Data-centric architecture
- Services surround core domain
- Great for event-driven systems

### Layered Architecture
- Presentation → Application → Domain → Infrastructure
- Clear separation of concerns
- Easy to test and maintain

### Modular Architecture
- Feature-based organization
- Self-contained modules
- Scales well for large teams

### Pipeline Architecture
- Linear data flow
- Input → Process → Transform → Store → Output
- Good for ETL and data processing

### Hexagonal Architecture
- Ports and adapters pattern
- Domain core isolated from infrastructure
- Highly testable

## 🛠️ How It Works

1. **Visual Representation**: Canvas-based visualization of different architectures
2. **Transformation Planning**: Analyzes current structure and generates migration steps
3. **jscodeshift Integration**: Uses AST manipulation to safely update code
4. **File Operations**: Generates bash scripts for file movements

## 📝 Example Workflow

1. Open the tool: `pnpm start`
2. Select "Layered Architecture"
3. Review the transformation plan
4. Click "Generate Script" to download `transform.sh`
5. Review the script
6. Run it: `bash transform.sh`
7. Or use individual transforms:

```bash
# Move files
mkdir -p layers/{presentation,application,domain,infrastructure}
mv src/pages layers/presentation/pages

# Update imports
jscodeshift -t transforms/update-imports.js src/ \
  --from='../pages' \
  --to='@presentation/pages'

# Add path aliases to tsconfig.json
# Then run:
jscodeshift -t transforms/add-path-alias.js src/
```

## 🎨 Extending

### Add a New Transform

Create a new file in `transforms/`:

```js
// transforms/my-transform.js
module.exports = function transformer(fileInfo, api, options) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  // Your transformation logic here
  
  return root.toSource();
};
```

### Add a New Shape

Edit `visualizer.js` and add your drawing function:

```js
function drawMyCustomLayout() {
  // Canvas drawing code
}
```

Then add it to the shape selector in `index.html`.

## 🔗 Resources

- [jscodeshift Documentation](https://github.com/facebook/jscodeshift)
- [AST Explorer](https://astexplorer.net/) - Test transforms visually
- [Codemod CLI](https://github.com/codemod-js/codemod)

## ⚠️ Important Notes

- **Always backup your code** before running transforms
- Test transforms on a small subset first
- Review generated scripts before executing
- Use version control (git) to easily revert if needed

## 🎯 Next Steps

This is a lightweight proof-of-concept. Future enhancements could include:

- Real-time diff preview
- Integration with git for safe rollback
- AI-assisted pattern detection
- Dependency graph analysis
- Interactive drag-and-drop architecture editing
- Multi-step transformation workflows
- Custom transform builder

## 📄 License

MIT
