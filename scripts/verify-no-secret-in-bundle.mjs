#!/usr/bin/env node
/**
 * After `next build`: proves the edge secret, its header and the API address are not in anything the browser downloads.
 *
 *   EDGE_SHARED_SECRET=<a sentinel> API_BASE_URL=https://api.storekit.site/v1 npm run build && npm run verify:bundle
 *
 * The scan is meaningful only if the server side does contain what the browser side must not, so the same strings are
 * first looked for in the server output as a control.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out); else out.push(path);
  }
  return out;
};
const contents = (files) => files.filter((f) => /\.(js|css|html|json|map|txt)$/.test(f)).map((f) => [f, readFileSync(f, 'utf8')]);

const sentinel = process.env.EDGE_SHARED_SECRET;
const forbidden = ['EDGE_SHARED_SECRET', 'x-storekit-edge-secret', 'API_BASE_URL', 'api.storekit.site', 'api-staging.storekit.site'];
if (sentinel && sentinel.length >= 32) forbidden.push(sentinel);

const client = contents([...walk(join(root, '.next/static')), ...walk(join(root, 'public'))]);
const server = contents(walk(join(root, '.next/server')));

if (client.length === 0 || server.length === 0) {
  console.error('No build output found. Run `npm run build` first.');
  process.exit(2);
}

// Control: the header name is written in lib/api.js, so it must be in the server output.
if (!server.some(([, text]) => text.includes('x-storekit-edge-secret'))) {
  console.error('Control failed: the server bundle does not contain the edge header, so this scan would prove nothing.');
  process.exit(2);
}

const leaks = [];
for (const [file, text] of client) for (const needle of forbidden) if (text.includes(needle)) leaks.push(`${file.replace(`${root}/`, '')} contains "${needle === sentinel ? '<the secret>' : needle}"`);

if (leaks.length) {
  console.error(`The browser bundle leaks server-only values:\n${leaks.map((l) => `  - ${l}`).join('\n')}`);
  process.exit(1);
}
console.log(`OK: ${client.length} browser files scanned, none contain the edge secret, its header or the API address. (${server.length} server files scanned as control.)`);
