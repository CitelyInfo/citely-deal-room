import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Embed the small demo in the Worker, leaving NO public asset directory that
// a hosting layer could serve before the invitation check runs.
const source = path.resolve('.invite-build');
const assets = {};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await collect(file); continue; }
    const type = types[path.extname(file)];
    if (!entry.isFile() || !type) throw new Error(`Unexpected build asset: ${file}`);
    assets['/' + path.relative(source, file).split(path.sep).join('/')] = {
      type, body: (await readFile(file)).toString('base64'),
    };
  }
}
await collect(source);
if (!assets['/case-study/index.html'] || !assets['/index.html']) throw new Error('Missing page output');
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
const worker = await readFile('server/invite-gate.mjs', 'utf8');
await writeFile('dist/server/index.js', `const bundledAssets = ${JSON.stringify(assets)};\n${worker}\nexport default { fetch(request, env) { return handleRequest(request, env, bundledAssets); } };\n`);
console.log(`Invitation-protected Worker built with ${Object.keys(assets).length} embedded assets.`);
