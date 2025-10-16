// Visual Architecture Transformer - Client Side
// This demonstrates the concept - actual transforms run server-side with jscodeshift

const canvas = document.getElementById('architecture-canvas');
const ctx = canvas.getContext('2d');
let currentShape = 'tree';
let nodes = [];
let selectedTransform = null;

// Sample repository structure
const repoStructure = {
    'src/pages': ['HomePage.jsx', 'MenuPage.jsx', 'EventsPage.jsx', 'GalleryPage.jsx'],
    'src/components': ['Header.jsx', 'Footer.jsx', 'Card.jsx', 'Button.jsx'],
    'api/routes': ['messages.js', 'campaigns.js', 'payments.js'],
    'backend/services': ['emailService.js', 'paymentService.js', 'dbService.js'],
    'studio/schemas': ['product.js', 'event.js', 'message.js']
};

// Initialize canvas
function initCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawArchitecture(currentShape);
}

// Draw different architecture patterns
function drawArchitecture(shape) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes = [];
    
    switch(shape) {
        case 'tree':
            drawTreeLayout();
            break;
        case 'circle':
            drawCircularLayout();
            break;
        case 'layers':
            drawLayeredLayout();
            break;
        case 'modular':
            drawModularLayout();
            break;
        case 'pipeline':
            drawPipelineLayout();
            break;
        case 'hexagonal':
            drawHexagonalLayout();
            break;
    }
}

function drawTreeLayout() {
    const centerX = canvas.width / 2;
    const startY = 50;
    const levelHeight = 80;
    
    // Root
    drawNode(centerX, startY, 'App Root', '#667eea');
    
    // Level 1
    const l1 = [
        {x: centerX - 200, y: startY + levelHeight, label: 'Frontend', color: '#f59e0b'},
        {x: centerX, y: startY + levelHeight, label: 'API', color: '#3b82f6'},
        {x: centerX + 200, y: startY + levelHeight, label: 'CMS', color: '#10b981'}
    ];
    
    l1.forEach(node => {
        drawNode(node.x, node.y, node.label, node.color);
        drawConnection(centerX, startY, node.x, node.y);
    });
    
    // Level 2
    const l2 = [
        {x: centerX - 250, y: startY + levelHeight * 2, label: 'Pages', color: '#f59e0b'},
        {x: centerX - 150, y: startY + levelHeight * 2, label: 'Components', color: '#f59e0b'},
        {x: centerX - 50, y: startY + levelHeight * 2, label: 'Routes', color: '#3b82f6'},
        {x: centerX + 50, y: startY + levelHeight * 2, label: 'Services', color: '#3b82f6'},
        {x: centerX + 150, y: startY + levelHeight * 2, label: 'Schemas', color: '#10b981'},
        {x: centerX + 250, y: startY + levelHeight * 2, label: 'Studio', color: '#10b981'}
    ];
    
    l2.forEach(node => {
        drawNode(node.x, node.y, node.label, node.color, 25);
        const parent = l1.find(p => Math.abs(p.x - node.x) < 150);
        if (parent) {
            drawConnection(parent.x, parent.y, node.x, node.y);
        }
    });
}

function drawCircularLayout() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 120;
    
    // Center
    drawNode(centerX, centerY, 'Data Core', '#10b981', 40);
    
    // Circle
    const items = [
        {label: 'UI Layer', color: '#f59e0b', angle: 0},
        {label: 'API Gateway', color: '#3b82f6', angle: Math.PI / 3},
        {label: 'Services', color: '#3b82f6', angle: 2 * Math.PI / 3},
        {label: 'Workers', color: '#8b5cf6', angle: Math.PI},
        {label: 'Storage', color: '#10b981', angle: 4 * Math.PI / 3},
        {label: 'Cache', color: '#06b6d4', angle: 5 * Math.PI / 3}
    ];
    
    items.forEach(item => {
        const x = centerX + radius * Math.cos(item.angle);
        const y = centerY + radius * Math.sin(item.angle);
        drawNode(x, y, item.label, item.color);
        drawConnection(centerX, centerY, x, y);
        
        // Connect to next in circle
        const nextAngle = item.angle + Math.PI / 3;
        const nextX = centerX + radius * Math.cos(nextAngle);
        const nextY = centerY + radius * Math.sin(nextAngle);
        drawConnection(x, y, nextX, nextY, true);
    });
}

function drawLayeredLayout() {
    const layers = [
        {y: 60, label: 'Presentation', items: ['Pages', 'Components', 'UI'], color: '#f59e0b'},
        {y: 140, label: 'Application', items: ['Services', 'Hooks', 'State'], color: '#3b82f6'},
        {y: 220, label: 'Domain', items: ['Models', 'Logic', 'Rules'], color: '#8b5cf6'},
        {y: 300, label: 'Infrastructure', items: ['API', 'Database', 'External'], color: '#10b981'}
    ];
    
    layers.forEach(layer => {
        const startX = (canvas.width - (layer.items.length * 100)) / 2;
        
        // Draw layer background
        ctx.fillStyle = layer.color + '20';
        ctx.fillRect(0, layer.y - 30, canvas.width, 60);
        
        layer.items.forEach((item, i) => {
            const x = startX + i * 120;
            drawNode(x, layer.y, item, layer.color, 30);
        });
        
        // Label
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(layer.label, 10, layer.y + 5);
    });
}

function drawModularLayout() {
    const modules = [
        {x: 150, y: 100, label: 'Auth\nModule', color: '#f59e0b'},
        {x: 350, y: 100, label: 'Payment\nModule', color: '#3b82f6'},
        {x: 550, y: 100, label: 'Messaging\nModule', color: '#10b981'},
        {x: 150, y: 250, label: 'Events\nModule', color: '#8b5cf6'},
        {x: 350, y: 250, label: 'CMS\nModule', color: '#ec4899'},
        {x: 550, y: 250, label: 'Analytics\nModule', color: '#06b6d4'}
    ];
    
    // Draw connections between related modules
    const connections = [
        [0, 1], [0, 3], [1, 2], [1, 4], [3, 4], [4, 5]
    ];
    
    connections.forEach(([from, to]) => {
        drawConnection(modules[from].x, modules[from].y, modules[to].x, modules[to].y, true);
    });
    
    modules.forEach(mod => {
        ctx.fillStyle = mod.color + '40';
        ctx.fillRect(mod.x - 70, mod.y - 50, 140, 100);
        ctx.strokeStyle = mod.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(mod.x - 70, mod.y - 50, 140, 100);
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        const lines = mod.label.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, mod.x, mod.y + i * 20);
        });
    });
}

function drawPipelineLayout() {
    const stages = [
        {x: 80, label: 'Input\n(Pages)', color: '#f59e0b'},
        {x: 200, label: 'Process\n(API)', color: '#3b82f6'},
        {x: 320, label: 'Transform\n(Services)', color: '#8b5cf6'},
        {x: 440, label: 'Store\n(Database)', color: '#10b981'},
        {x: 560, label: 'Output\n(UI)', color: '#06b6d4'}
    ];
    
    const y = canvas.height / 2;
    
    stages.forEach((stage, i) => {
        drawNode(stage.x, y, stage.label, stage.color, 35);
        
        if (i < stages.length - 1) {
            // Draw arrow to next stage
            drawArrow(stage.x + 35, y, stages[i + 1].x - 35, y, stage.color);
        }
    });
}

function drawHexagonalLayout() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Core domain
    drawHexagon(centerX, centerY, 50, '#8b5cf6');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Domain', centerX, centerY - 10);
    ctx.fillText('Core', centerX, centerY + 10);
    
    // Ports (inner ring)
    const ports = [
        {angle: 0, label: 'API', color: '#3b82f6'},
        {angle: Math.PI / 3, label: 'UI', color: '#f59e0b'},
        {angle: 2 * Math.PI / 3, label: 'Events', color: '#10b981'},
        {angle: Math.PI, label: 'Storage', color: '#10b981'},
        {angle: 4 * Math.PI / 3, label: 'Queue', color: '#8b5cf6'},
        {angle: 5 * Math.PI / 3, label: 'Cache', color: '#06b6d4'}
    ];
    
    ports.forEach(port => {
        const x = centerX + 100 * Math.cos(port.angle);
        const y = centerY + 100 * Math.sin(port.angle);
        drawNode(x, y, port.label, port.color, 25);
        drawConnection(centerX, centerY, x, y);
    });
    
    // Adapters (outer ring)
    ports.forEach(port => {
        const x = centerX + 160 * Math.cos(port.angle);
        const y = centerY + 160 * Math.sin(port.angle);
        drawNode(x, y, 'Adapter', port.color, 20);
        const innerX = centerX + 100 * Math.cos(port.angle);
        const innerY = centerY + 100 * Math.sin(port.angle);
        drawConnection(innerX, innerY, x, y, true);
    });
}

// Drawing utilities
function drawNode(x, y, label, color, radius = 30) {
    nodes.push({x, y, label, color, radius});
    
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const lines = label.split('\n');
    lines.forEach((line, i) => {
        ctx.fillText(line, x, y + (i - lines.length/2 + 0.5) * 14);
    });
}

function drawConnection(x1, y1, x2, y2, dashed = false) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    
    if (dashed) {
        ctx.setLineDash([5, 5]);
    } else {
        ctx.setLineDash([]);
    }
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawArrow(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    
    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Arrow head
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function drawHexagon(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

// Shape selector
document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentShape = this.dataset.shape;
        drawArchitecture(currentShape);
        updateTransformPreview(currentShape);
    });
});

// Generate transformation preview
function updateTransformPreview(shape) {
    const preview = document.getElementById('transform-preview');
    const transforms = getTransformPlan(shape);
    
    let html = '';
    transforms.forEach((step, i) => {
        html += `
            <div class="transform-step">
                <div class="step-title">Step ${i + 1}: ${step.title}</div>
                <p>${step.description}</p>
                ${step.code ? `<div class="code-block">${escapeHtml(step.code)}</div>` : ''}
            </div>
        `;
    });
    
    preview.innerHTML = html;
    
    // Update stats
    document.getElementById('file-count').textContent = transforms.reduce((sum, t) => sum + (t.fileCount || 0), 0);
    document.getElementById('import-count').textContent = transforms.reduce((sum, t) => sum + (t.importCount || 0), 0);
    document.getElementById('risk-level').textContent = transforms.length > 5 ? 'High' : transforms.length > 3 ? 'Medium' : 'Low';
}

function getTransformPlan(shape) {
    const plans = {
        circle: [
            {
                title: 'Create Circular Flow Structure',
                description: 'Reorganize into data-centric architecture with services surrounding core',
                fileCount: 12,
                importCount: 34,
                code: `// New structure:\n/core\n  /data\n  /models\n/layers\n  /ui\n  /api\n  /services\n  /storage`
            },
            {
                title: 'Move Data Models to Core',
                description: 'Extract all data models to central /core directory',
                fileCount: 8,
                importCount: 23,
                code: `mv src/models/* core/models/\nmv studio/schemas/* core/schemas/`
            },
            {
                title: 'Update Import Paths (jscodeshift)',
                description: 'Automatically fix all import statements',
                importCount: 23,
                code: `jscodeshift -t transforms/update-imports.js src/\n\n// Transform example:\nimport { User } from '../models/User'\n// becomes:\nimport { User } from '@core/models/User'`
            },
            {
                title: 'Create Barrel Exports',
                description: 'Add index.js files for cleaner imports',
                fileCount: 6,
                code: `// core/index.js\nexport * from './models';\nexport * from './schemas';`
            }
        ],
        layers: [
            {
                title: 'Create Layered Architecture',
                description: 'Separate into presentation, application, domain, and infrastructure layers',
                fileCount: 45,
                importCount: 67,
                code: `mkdir -p layers/{presentation,application,domain,infrastructure}`
            },
            {
                title: 'Move UI Components to Presentation',
                description: 'Relocate all pages and components',
                fileCount: 15,
                code: `mv src/pages layers/presentation/pages\nmv src/components layers/presentation/components`
            },
            {
                title: 'Extract Business Logic to Domain',
                description: 'Identify and move domain logic from components',
                fileCount: 8,
                importCount: 19,
                code: `// Use jscodeshift to extract:\n// - Validation logic\n// - Business rules\n// - Domain models`
            },
            {
                title: 'Create Infrastructure Layer',
                description: 'Move API clients and external integrations',
                fileCount: 12,
                importCount: 28,
                code: `mv api/* layers/infrastructure/api\nmv src/services layers/infrastructure/services`
            },
            {
                title: 'Update Dependencies (jscodeshift)',
                description: 'Ensure layers only depend on layers below them',
                importCount: 67,
                code: `// Enforce:\n// Presentation -> Application -> Domain\n// All layers can use Infrastructure`
            }
        ],
        modular: [
            {
                title: 'Create Module Structure',
                description: 'Organize by feature modules instead of technical layers',
                fileCount: 38,
                importCount: 52,
                code: `mkdir -p modules/{auth,payments,events,messaging,cms}`
            },
            {
                title: 'Group Related Files',
                description: 'Move all files related to each feature into its module',
                fileCount: 38,
                code: `// Each module contains:\n// - components/\n// - hooks/\n// - services/\n// - types/\n// - index.ts`
            },
            {
                title: 'Create Module Boundaries',
                description: 'Add barrel exports and prevent cross-module imports',
                fileCount: 6,
                importCount: 52,
                code: `// modules/payments/index.ts\nexport { PaymentForm } from './components';\nexport { usePayment } from './hooks';\nexport type { Payment } from './types';`
            }
        ],
        pipeline: [
            {
                title: 'Create Pipeline Stages',
                description: 'Organize code into sequential processing stages',
                fileCount: 28,
                importCount: 41,
                code: `mkdir -p pipeline/{input,process,transform,store,output}`
            },
            {
                title: 'Map Components to Stages',
                description: 'Identify which files belong to each stage',
                fileCount: 28,
                code: `// input: Forms, API endpoints\n// process: Validation, parsing\n// transform: Business logic\n// store: Database operations\n// output: Rendering, responses`
            }
        ],
        hexagonal: [
            {
                title: 'Create Hexagonal Architecture',
                description: 'Implement ports and adapters pattern',
                fileCount: 35,
                importCount: 48,
                code: `mkdir -p hexagonal/{core,ports,adapters}`
            },
            {
                title: 'Extract Domain Core',
                description: 'Identify pure business logic',
                fileCount: 10,
                code: `// hexagonal/core/\n// - Pure domain models\n// - Business rules\n// - No external dependencies`
            },
            {
                title: 'Define Ports',
                description: 'Create interfaces for external interactions',
                fileCount: 8,
                code: `// hexagonal/ports/\nexport interface PaymentPort {\n  processPayment(amount: number): Promise<Result>;\n}\n\nexport interface StoragePort {\n  save(data: any): Promise<void>;\n}`
            },
            {
                title: 'Implement Adapters',
                description: 'Create concrete implementations',
                fileCount: 17,
                importCount: 48,
                code: `// hexagonal/adapters/\nexport class SquarePaymentAdapter implements PaymentPort {\n  async processPayment(amount: number) {\n    // Square-specific implementation\n  }\n}`
            }
        ]
    };
    
    return plans[shape] || [{title: 'No transform needed', description: 'Current tree structure is optimal'}];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Action buttons
function generateScript() {
    const script = generateTransformScript(currentShape);
    downloadFile('transform.sh', script);
}

function showDiff() {
    alert('Diff view would show before/after file structure comparison');
}

function applyTransform() {
    if (confirm(`This will transform your codebase to ${currentShape} architecture. Continue?`)) {
        alert('In a real implementation, this would execute the jscodeshift transforms and file movements.');
    }
}

function generateTransformScript(shape) {
    const plan = getTransformPlan(shape);
    let script = `#!/bin/bash
# Generated transformation script for ${shape} architecture
# Generated on ${new Date().toISOString()}

set -e  # Exit on error

echo "🚀 Starting architecture transformation to ${shape}"
echo ""

`;

    plan.forEach((step, i) => {
        script += `# Step ${i + 1}: ${step.title}
echo "Step ${i + 1}: ${step.title}"
${step.code ? step.code.split('\n').filter(line => !line.startsWith('//')).join('\n') : '# No code for this step'}

`;
    });
    
    script += `
echo ""
echo "✅ Transformation complete!"
echo "📝 Please review changes before committing"
`;
    
    return script;
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize
window.addEventListener('load', () => {
    initCanvas();
    updateTransformPreview('tree');
});

window.addEventListener('resize', initCanvas);
