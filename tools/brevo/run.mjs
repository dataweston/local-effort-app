import { spawn } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: __dirname, stdio: ['pipe', 'pipe', 'inherit'] });
    let out = '';
    p.stdout.on('data', d => out += d.toString());
    p.on('close', code => code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)));
    if (input) p.stdin.end(input);
  });
}

const tokensJson = await run('node', ['sanity-to-brevo.mjs']);
const html = await run('node', ['render.mjs'], tokensJson);
const result = await run('node', ['upsert-brevo.mjs'], html);
console.log(result);