/**
 * Visual Refactor Server
 * Serves the UI and executes jscodeshift transformations
 */

const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const cors = require('cors');

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Serve the main UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API: Analyze repository structure
app.post('/api/analyze', async (req, res) => {
  try {
    const repoPath = req.body.repoPath || process.cwd();
    const structure = await analyzeRepo(repoPath);
    res.json({ success: true, structure });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Preview transformation
app.post('/api/preview', async (req, res) => {
  try {
    const { shape, files } = req.body;
    const plan = generateTransformPlan(shape, files);
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Execute transformation
app.post('/api/transform', async (req, res) => {
  try {
    const { transform, options } = req.body;
    
    console.log(`Executing transform: ${transform}`);
    console.log('Options:', options);
    
    const result = await executeTransform(transform, options);
    
    res.json({ 
      success: true, 
      result,
      message: 'Transformation completed successfully'
    });
  } catch (error) {
    console.error('Transform error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze repository structure
async function analyzeRepo(repoPath) {
  const structure = {};
  
  async function walk(dir, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(prefix, entry.name);
      
      // Skip node_modules, .git, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      
      if (entry.isDirectory()) {
        structure[relativePath] = [];
        await walk(fullPath, relativePath);
      } else if (entry.name.match(/\.(js|jsx|ts|tsx)$/)) {
        const dir = path.dirname(relativePath);
        if (!structure[dir]) {
          structure[dir] = [];
        }
        structure[dir].push(entry.name);
      }
    }
  }
  
  await walk(repoPath);
  return structure;
}

// Generate transformation plan based on shape
function generateTransformPlan(shape, files) {
  const plans = {
    circular: {
      steps: [
        'Create /core directory structure',
        'Move models to core/models',
        'Update imports with jscodeshift',
        'Create barrel exports'
      ],
      moves: [
        { from: 'src/models/*', to: 'core/models/' },
        { from: 'studio/schemas/*', to: 'core/schemas/' }
      ],
      transforms: [
        { type: 'update-imports', from: '../models', to: '@core/models' }
      ]
    },
    layers: {
      steps: [
        'Create layered directory structure',
        'Move UI to presentation layer',
        'Extract business logic to domain',
        'Move infrastructure code'
      ],
      moves: [
        { from: 'src/pages/*', to: 'layers/presentation/pages/' },
        { from: 'src/components/*', to: 'layers/presentation/components/' },
        { from: 'api/*', to: 'layers/infrastructure/api/' }
      ],
      transforms: [
        { type: 'update-imports', from: '../pages', to: '@presentation/pages' },
        { type: 'add-path-alias' }
      ]
    },
    modular: {
      steps: [
        'Create module directories',
        'Group related files by feature',
        'Add barrel exports',
        'Enforce module boundaries'
      ],
      modules: ['auth', 'payments', 'events', 'messaging', 'cms'],
      transforms: [
        { type: 'extract-to-module' },
        { type: 'add-path-alias' }
      ]
    }
  };
  
  return plans[shape] || { steps: [], moves: [], transforms: [] };
}

// Execute jscodeshift transformation
function executeTransform(transformName, options) {
  return new Promise((resolve, reject) => {
    const transformPath = path.join(__dirname, 'transforms', `${transformName}.js`);
    const targetPath = options.targetPath || '../..';
    
    const optionFlags = Object.entries(options)
      .filter(([key]) => key !== 'targetPath')
      .map(([key, value]) => `--${key}=${value}`)
      .join(' ');
    
    const command = `npx jscodeshift -t ${transformPath} ${targetPath} ${optionFlags}`;
    
    console.log('Executing:', command);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      resolve({
        stdout,
        stderr,
        command
      });
    });
  });
}

app.listen(PORT, () => {
  console.log(`
🎨 Visual Architecture Transformer
=================================
Server running at: http://localhost:${PORT}

Available transforms:
  - update-imports     Update import paths after moving files
  - extract-to-module  Extract code to modular architecture
  - add-path-alias     Convert relative imports to path aliases

Try opening http://localhost:${PORT} in your browser!
  `);
});

module.exports = app;
