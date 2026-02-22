#!/usr/bin/env bun
import { $ } from 'bun';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function getManifestVersion(srcPath: string): Promise<string> {
  const file = Bun.file(srcPath);
  if (!await file.exists()) {
    throw new Error(`❌ Manifest not found at ${srcPath}`);
  }
  const manifest = await file.json();
  return manifest.version;
}

console.log('🚀 Starting release process...\n');

console.log('\n🔨 Building extensions...');
await $`bun run build`;

await mkdir('releases', { recursive: true });

try {
  const chromeVersion = await getManifestVersion('src/chrome/manifest.json');
  console.log(`\n📦 Packaging Chrome v${chromeVersion}...`);


  await $`cd dist/chrome && zip -r ../../releases/chrome-v${chromeVersion}.zip .`;
  console.log(`  ✅ Created releases/chrome-v${chromeVersion}.zip`);
} catch (e) {
  console.error('❌ Failed to package Chrome extension:', e);
  process.exit(1);
}

try {
  const firefoxVersion = await getManifestVersion('src/firefox/manifest.json');
  console.log(`\n📦 Packaging Firefox v${firefoxVersion}...`);

  await $`cd dist/firefox && zip -r ../../releases/firefox-v${firefoxVersion}.zip .`;
  console.log(`  ✅ Created releases/firefox-v${firefoxVersion}.zip`);
} catch (e) {
  console.error('❌ Failed to package Firefox extension:', e);
  process.exit(1);
}

console.log(`\n✨ Release completed successfully!`);
