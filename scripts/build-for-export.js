#!/usr/bin/env node
import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

export async function buildForExport(exportState) {
  console.log('🏗️  Building project for static export...\n');

  // Create a temporary directory for the build
  const tempBuildDir = resolve(rootDir, '.temp-export-build');
  
  // Clean up any existing temp directory
  if (existsSync(tempBuildDir)) {
    rmSync(tempBuildDir, { recursive: true, force: true });
  }

  try {
    // Build with Vite
    console.log('🔨 Running Vite build...\n');
    
    await build({
      root: rootDir,
      build: {
        outDir: tempBuildDir,
        emptyOutDir: true,
        minify: true,
        rollupOptions: {
          output: {
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]'
          }
        }
      },
      base: './'
    });

    console.log('✅ Build completed\n');

    // Now create the ZIP with the built assets
    const zip = new JSZip();
    
    // Read the built index.html
    const indexPath = resolve(tempBuildDir, 'index.html');
    let indexHtml = readFileSync(indexPath, 'utf-8');
    
    // Inject the export state
    const stateScript = `
    <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
      window.__STATIC_MODE__ = true;
    </script>
    `;
    
    indexHtml = indexHtml.replace('</head>', stateScript + '</head>');
    
    // Add the modified index.html to ZIP
    zip.file('index.html', indexHtml);
    
    // Copy all assets
    const assetsDir = resolve(tempBuildDir, 'assets');
    if (existsSync(assetsDir)) {
      const assetsFolder = zip.folder('assets');
      const assetFiles = readdirSync(assetsDir);
      
      for (const file of assetFiles) {
        const filePath = resolve(assetsDir, file);
        const content = readFileSync(filePath);
        assetsFolder.file(file, content);
        console.log(`  Added asset: ${file}`);
      }
    }
    
    // Add README
    const readme = `# 静的分析レポート

このフォルダには、CSV分析結果の静的バージョンが含まれています。

## 使用方法
1. index.htmlをWebブラウザで開いてください
2. インターネット接続が必要です（Tailwind CSSのCDNを使用）

## 生成日時
${new Date().toLocaleString('ja-JP')}

## 含まれるデータ
- 分析済みアイテム: ${exportState.analyzedData?.length || 0}件
- 抽出されたトピック: ${exportState.extractedTopics?.length || 0}件

## ファイル構成
- index.html: メインファイル
- assets/: JavaScript、CSS、その他のアセット
`;
    
    zip.file('README.txt', readme);
    
    // Clean up temp directory
    rmSync(tempBuildDir, { recursive: true, force: true });
    
    console.log('\n✅ Export package created successfully!');
    
    return zip;
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    
    // Clean up on error
    if (existsSync(tempBuildDir)) {
      rmSync(tempBuildDir, { recursive: true, force: true });
    }
    
    throw error;
  }
}

// If called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  // Read export state from file
  const stateFilePath = resolve(rootDir, '.static-export-state.json');
  
  if (!existsSync(stateFilePath)) {
    console.error('❌ No export state found. Please export from the web UI first.');
    process.exit(1);
  }
  
  const exportState = JSON.parse(readFileSync(stateFilePath, 'utf-8'));
  
  buildForExport(exportState)
    .then(async (zip) => {
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      const outputPath = resolve(rootDir, 'static-export.zip');
      writeFileSync(outputPath, buffer);
      console.log(`📦 Saved to: ${outputPath}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}