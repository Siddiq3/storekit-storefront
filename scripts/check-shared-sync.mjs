#!/usr/bin/env node
/**
 * The shared and validation packages are copies of `backend/packages/*`, as in the website and the app. Compares them
 * with the backend checkout next to this repository, if there is one.
 */
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const backend = join(root, '..', 'backend', 'packages');
if (!existsSync(backend)) { console.log('No ../backend checkout: nothing to compare.'); process.exit(0); }

let failed = false;
for (const pkg of ['shared', 'validation']) {
  try {
    execFileSync('diff', ['-rq', join(backend, pkg, 'src'), join(root, 'packages', pkg, 'src')], { stdio: 'pipe' });
  } catch (error) {
    failed = true;
    console.error(`packages/${pkg} differs from backend/packages/${pkg}:\n${error.stdout}`);
  }
}
if (failed) process.exit(1);
console.log('packages/shared and packages/validation match the backend.');
