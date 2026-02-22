#!/usr/bin/env bun
import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';


const vendorDir = join(import.meta.dir, '..', 'vendor');
const polyfillSource = join(
  import.meta.dir,
  '..',
  'node_modules',
  'webextension-polyfill',
  'dist',
  'browser-polyfill.min.js'
);
const polyfillDest = join(vendorDir, 'browser-polyfill.min.js');

console.log('📦 Setting up vendor files...');

await mkdir(vendorDir, { recursive: true });
await copyFile(polyfillSource, polyfillDest);

console.log('✅ browser-polyfill.min.js copied to vendor/');
