#!/usr/bin/env bun
import { rm, mkdir, readdir, copyFile, cp, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function copyAny(srcPath: string, destPath: string) {
  const s = await stat(srcPath);

  if (s.isDirectory()) {
    await cp(srcPath, destPath, { recursive: true });
  } else {
    await copyFile(srcPath, destPath);
  }
}

const transpiler = new Bun.Transpiler({
  loader: 'js',
});

async function processJsFile(srcPath: string, distPath: string) {
  const file = Bun.file(srcPath);
  let code = await file.text();

  await Bun.write(distPath, code);
}

async function build(target: 'chrome' | 'firefox') {
  console.log(`🔨 Building ${target}...`);

  const srcDir = join(import.meta.dir, '..', 'src', target);
  const distDir = join(import.meta.dir, '..', 'dist', target);
  const vendorDir = join(import.meta.dir, '..', 'vendor');

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const files = await readdir(srcDir);

  for (const file of files) {
    const srcPath = join(srcDir, file);
    const distPath = join(distDir, file);

    if (file.endsWith('.js')) {
      await processJsFile(srcPath, distPath);
    } else {
      await copyAny(srcPath, distPath);
    }
  }


  const polyfillSrc = join(vendorDir, 'browser-polyfill.min.js');
  const polyfillDest = join(distDir, 'browser-polyfill.min.js');

  await copyFile(polyfillSrc, polyfillDest);
  console.log(`  ✓ browser-polyfill.min.js (vendor)`);

  console.log(`✅ ${target} built successfully\n`);
}

const target = process.argv[2] as 'chrome' | 'firefox' | undefined;

if (target && !['chrome', 'firefox'].includes(target)) {
  console.error('Usage: bun run build.ts [chrome|firefox]');
  process.exit(1);
}

if (target) {
  await build(target);
} else {
  await build('chrome');
  await build('firefox');
}
