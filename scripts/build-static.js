#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

async function buildStaticSite() {
  console.log('🏗️  Building static site with embedded data...\n');

  // Read the saved state from localStorage simulation file
  const stateFilePath = resolve(rootDir, '.static-export-state.json');
  
  if (!existsSync(stateFilePath)) {
    console.error('❌ No export state found. Please use the "📊 レポート" button in the app first to save the state.');
    process.exit(1);
  }

  const exportState = JSON.parse(readFileSync(stateFilePath, 'utf-8'));
  console.log('✅ Export state loaded');
  console.log(`   - ${exportState.analyzedData?.length || 0} analyzed items`);
  console.log(`   - ${exportState.extractedTopics?.length || 0} topics\n`);

  // Create a temporary index.html with embedded state
  const indexPath = resolve(rootDir, 'index.html');
  const originalIndex = readFileSync(indexPath, 'utf-8');
  
  const modifiedIndex = originalIndex.replace(
    '</head>',
    `<script>
      window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
      window.__STATIC_MODE__ = true;
    </script>
    </head>`
  );

  // Write temporary index.html
  const tempIndexPath = resolve(rootDir, '.temp-index.html');
  writeFileSync(tempIndexPath, modifiedIndex);

  try {
    // Build with Vite
    console.log('🔨 Building with Vite...\n');
    
    await build({
      root: rootDir,
      build: {
        outDir: 'dist-static',
        emptyOutDir: true,
        rollupOptions: {
          input: tempIndexPath
        }
      },
      base: './'
    });

    // Fix the output HTML file name
    const distPath = resolve(rootDir, 'dist-static');
    if (existsSync(resolve(distPath, '.temp-index.html'))) {
      cpSync(
        resolve(distPath, '.temp-index.html'),
        resolve(distPath, 'index.html'),
        { force: true }
      );
      rmSync(resolve(distPath, '.temp-index.html'));
    }

    console.log('\n✅ Static site built successfully!');
    console.log(`📁 Output directory: ${distPath}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Upload the contents of dist-static/ to your web server');
    console.log('   2. Or test locally with: npx serve dist-static\n');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  } finally {
    // Clean up temporary files
    if (existsSync(tempIndexPath)) {
      rmSync(tempIndexPath);
    }
  }
}

buildStaticSite();