import JSZip from 'jszip';
import { ExportState } from './staticExportUtils';

export async function buildStaticExport(
  exportState: ExportState,
  onProgress?: (progress: { status: string; message: string; progress?: number }) => void
): Promise<Blob> {
  try {
    onProgress?.({ status: 'building', message: '静的サイトをビルド中...', progress: 10 });
    
    // Save the export state first
    localStorage.setItem('static-export-state', JSON.stringify(exportState));
    
    // Check if we have a pre-built version available
    const distExists = await checkDistFolder();
    
    if (distExists) {
      // Use existing dist folder
      onProgress?.({ status: 'building', message: 'ビルド済みファイルを使用...', progress: 30 });
      return await createZipFromDist(exportState, onProgress);
    }
    
    // Otherwise, we need to trigger a build first
    onProgress?.({ status: 'building', message: 'プロジェクトをビルド中...', progress: 20 });
    
    // For development, we'll use the current page assets
    return await createZipFromCurrentPage(exportState, onProgress);
    
  } catch (error) {
    console.error('Build error:', error);
    throw error;
  }
}

async function checkDistFolder(): Promise<boolean> {
  try {
    const response = await fetch('/dist/index.html');
    return response.ok;
  } catch {
    return false;
  }
}

async function createZipFromDist(
  exportState: ExportState,
  onProgress?: (progress: { status: string; message: string; progress?: number }) => void
): Promise<Blob> {
  const zip = new JSZip();
  
  onProgress?.({ status: 'building', message: 'ビルドファイルを収集中...', progress: 40 });
  
  // Get the built index.html
  const indexResponse = await fetch('/dist/index.html');
  let indexHtml = await indexResponse.text();
  
  // Inject the export state
  const stateScript = `
  <script>
    window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
    window.__STATIC_MODE__ = true;
  </script>
  `;
  
  indexHtml = indexHtml.replace('</head>', stateScript + '</head>');
  zip.file('index.html', indexHtml);
  
  // TODO: Collect assets from dist/assets
  
  return finalizeZip(zip, exportState, onProgress);
}

async function createZipFromCurrentPage(
  exportState: ExportState,
  onProgress?: (progress: { status: string; message: string; progress?: number }) => void
): Promise<Blob> {
  const zip = new JSZip();
  
  onProgress?.({ status: 'building', message: '現在のページからアセットを収集中...', progress: 40 });
  
  // Get the current page HTML
  const currentHtml = document.documentElement.outerHTML;
  
  // Parse and modify the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(currentHtml, 'text/html');
  
  // Remove development-specific scripts
  const devScripts = doc.querySelectorAll('script[src*="/@vite/client"], script[type="module"][src*=".tsx"]');
  devScripts.forEach(script => script.remove());
  
  // Add the export state
  const stateScript = doc.createElement('script');
  stateScript.textContent = `
    window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
    window.__STATIC_MODE__ = true;
  `;
  doc.head.appendChild(stateScript);
  
  // Find all script and link tags
  const scripts = doc.querySelectorAll('script[src]:not([src^="http"]):not([src^="//"])');
  const links = doc.querySelectorAll('link[rel="stylesheet"][href]:not([href^="http"]):not([href^="//"])');
  
  const assetsFolder = zip.folder('assets');
  
  // Process scripts
  for (const script of scripts) {
    const src = script.getAttribute('src');
    if (src && !src.includes('/@vite/')) {
      try {
        const url = new URL(src, window.location.origin);
        const response = await fetch(url.href);
        if (response.ok) {
          const content = await response.text();
          const filename = src.split('/').pop() || 'script.js';
          assetsFolder?.file(filename, content);
          script.setAttribute('src', `./assets/${filename}`);
          onProgress?.({ status: 'building', message: `アセットを追加: ${filename}`, progress: 50 });
        }
      } catch (error) {
        console.error(`Failed to fetch script: ${src}`, error);
      }
    }
  }
  
  // Process stylesheets
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href) {
      try {
        const url = new URL(href, window.location.origin);
        const response = await fetch(url.href);
        if (response.ok) {
          const content = await response.text();
          const filename = href.split('/').pop() || 'style.css';
          assetsFolder?.file(filename, content);
          link.setAttribute('href', `./assets/${filename}`);
          onProgress?.({ status: 'building', message: `アセットを追加: ${filename}`, progress: 60 });
        }
      } catch (error) {
        console.error(`Failed to fetch stylesheet: ${href}`, error);
      }
    }
  }
  
  // For development mode, we need to bundle the React app
  if (import.meta.env.DEV) {
    onProgress?.({ status: 'building', message: 'React アプリケーションをバンドル中...', progress: 70 });
    
    // Create a minimal loader script
    const loaderScript = `
// Static export loader
(function() {
  console.log('Static export loaded');
  
  // Wait for React to be available
  if (window.__INITIAL_STATE__ && window.__STATIC_MODE__) {
    console.log('Running in static mode with pre-loaded data');
    
    // The React app should automatically detect the static mode
    // and render the StaticApp component with the pre-loaded data
  }
})();
`;
    
    assetsFolder?.file('static-loader.js', loaderScript);
    
    // Add the loader script to the document
    const loaderTag = doc.createElement('script');
    loaderTag.src = './assets/static-loader.js';
    loaderTag.defer = true;
    doc.body.appendChild(loaderTag);
  }
  
  // Serialize the final HTML
  const finalHtml = doc.documentElement.outerHTML;
  zip.file('index.html', finalHtml);
  
  return finalizeZip(zip, exportState, onProgress);
}

async function finalizeZip(
  zip: JSZip,
  exportState: ExportState,
  onProgress?: (progress: { status: string; message: string; progress?: number }) => void
): Promise<Blob> {
  onProgress?.({ status: 'zipping', message: 'ZIPファイルを生成中...', progress: 80 });
  
  // Add README
  const readme = `# CSV分析結果 - 静的レポート

## 概要
このレポートは、CSV分析ツールで生成された静的バージョンです。
すべての分析結果がHTMLファイルに埋め込まれており、サーバーなしで閲覧できます。

## 含まれるデータ
- 生成日時: ${new Date(exportState.timestamp).toLocaleString('ja-JP')}
- 分析済みデータ: ${exportState.analyzedData?.length || 0}件
- 抽出されたトピック: ${exportState.extractedTopics?.length || 0}件
- 選択されたカラム: ${exportState.selectedColumn || 'なし'}

## 使用方法
1. ZIPファイルを解凍してください
2. index.htmlをWebブラウザで開いてください
3. インターネット接続が必要です（Tailwind CSSのCDNを使用）

## ファイル構成
- index.html: メインファイル
- assets/: JavaScript と CSS ファイル
- README.txt: このファイル

## フィルタ情報
${exportState.filters?.selectedTopic ? `- トピック: ${exportState.filters.selectedTopic}` : ''}
${exportState.filters?.selectedSubTopic ? `- サブトピック: ${exportState.filters.selectedSubTopic}` : ''}
${exportState.filters?.selectedKptType ? `- KPTタイプ: ${exportState.filters.selectedKptType}` : ''}
${exportState.filters?.selectedPrefecture ? `- 都道府県: ${exportState.filters.selectedPrefecture}` : ''}

## 注意事項
- このレポートは読み取り専用です
- 新たな分析や編集はできません
- すべてのデータはHTMLファイルに埋め込まれています
`;
  
  zip.file('README.txt', readme);
  
  onProgress?.({ status: 'zipping', message: '圧縮中...', progress: 90 });
  
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  onProgress?.({ status: 'complete', message: '完了しました！', progress: 100 });
  
  return blob;
}