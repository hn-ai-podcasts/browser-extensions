#!/usr/bin/env bun
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const transpiler = new Bun.Transpiler({
  loader: 'js',
  target: 'browser',
});

async function processFile(filePath: string): Promise<boolean> {
  const file = Bun.file(filePath);
  const code = await file.text();

  const cleaned = transpiler.transformSync(code);

  if (code !== cleaned) {
    await Bun.write(filePath, cleaned);
    console.log(`  ✓ ${filePath}`);
    return true;
  }
  return false;
}

async function processDirectory(dir: string): Promise<number> {
  const entries = await readdir(dir, { withFileTypes: true });
  let count = 0;

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      count += await processDirectory(fullPath);
    } else if (entry.name.endsWith('.js')) {
      if (await processFile(fullPath)) count++;
    }
  }

  return count;
}

// Main
const targetFiles = process.argv.slice(2);

if (targetFiles.length === 0) {
  console.error('Usage: bun run scripts/strip-comments.ts <file1.js> [file2.js...]');
  process.exit(1);
}

console.log('🧹 Stripping comments...');
let count = 0;

for (const file of targetFiles) {
  if (await processFile(file)) count++;
}

if (count > 0) {
  console.log(`✅ Cleaned ${count} file(s)`);
} else {
  console.log('✅ No changes needed');
}
