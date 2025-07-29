import JSZip from 'jszip';
import { ExportState } from './staticExportUtils';

export async function createZipFromBuild(
  exportState: ExportState,
  onProgress?: (progress: { status: string; message: string; progress?: number }) => void
): Promise<Blob> {
  try {
    const zip = new JSZip();
    
    onProgress?.({ status: 'building', message: 'ビルド済みファイルを収集中...', progress: 30 });
    
    // First check if we have a dist folder
    const checkDistResponse = await fetch('/dist/index.html');
    
    if (checkDistResponse.ok) {
      // We have a dist folder, use it
      let indexHtml = await checkDistResponse.text();
      
      // Fix asset paths to be relative and remove crossorigin
      indexHtml = indexHtml
        .replace(/href="\/assets\//g, 'href="./assets/')
        .replace(/src="\/assets\//g, 'src="./assets/')
        .replace('href="/vite.svg"', 'href="#"')
        .replace(/ crossorigin/g, ''); // Remove crossorigin attribute which can cause issues with file:// protocol
      
      // Inject the export state
      const stateScript = `
    <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
      window.__STATIC_MODE__ = true;
    </script>
    `;
      
      indexHtml = indexHtml.replace('</head>', stateScript + '</head>');
      zip.file('index.html', indexHtml);
      
      // Get the assets
      const assetsFolder = zip.folder('assets');
      
      // Parse the HTML to find asset references
      const parser = new DOMParser();
      const doc = parser.parseFromString(indexHtml, 'text/html');
      
      // Find all script and link tags
      const scripts = doc.querySelectorAll('script[src*="/assets/"]');
      const links = doc.querySelectorAll('link[href*="/assets/"]');
      
      onProgress?.({ status: 'building', message: 'JavaScriptファイルを収集中...', progress: 40 });
      
      // Extract actual asset filenames from the HTML
      let jsFilename = '';
      let cssFilename = '';
      
      // Find the actual filenames from script and link tags
      for (const script of scripts) {
        const src = script.getAttribute('src');
        if (src && src.includes('/assets/')) {
          jsFilename = src.split('/').pop() || '';
          break;
        }
      }
      
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.includes('/assets/')) {
          cssFilename = href.split('/').pop() || '';
          break;
        }
      }
      
      console.log('Found asset filenames:', { js: jsFilename, css: cssFilename });
      
      onProgress?.({ status: 'building', message: 'JavaScriptファイルを収集中...', progress: 40 });
      
      // Download the JavaScript file
      if (jsFilename) {
        try {
          const jsResponse = await fetch(`/dist/assets/${jsFilename}`);
          if (jsResponse.ok) {
            const jsContent = await jsResponse.text();
            assetsFolder?.file(jsFilename, jsContent);
            console.log(`Added JS: ${jsFilename}`);
          } else {
            console.error(`Failed to fetch JS: ${jsResponse.status}`);
          }
        } catch (error) {
          console.error(`Failed to fetch JS:`, error);
        }
      }
      
      onProgress?.({ status: 'building', message: 'CSSファイルを収集中...', progress: 50 });
      
      // Download the CSS file
      if (cssFilename) {
        try {
          const cssResponse = await fetch(`/dist/assets/${cssFilename}`);
          if (cssResponse.ok) {
            const cssContent = await cssResponse.text();
            assetsFolder?.file(cssFilename, cssContent);
            console.log(`Added CSS: ${cssFilename}`);
          } else {
            console.error(`Failed to fetch CSS: ${cssResponse.status}`);
          }
        } catch (error) {
          console.error(`Failed to fetch CSS:`, error);
        }
      }
      
    } else {
      // No dist folder, try to get assets from the current build
      onProgress?.({ status: 'building', message: '代替方法でアセットを収集中...', progress: 40 });
      
      // Try to fetch the built assets directly
      try {
        // Check for common asset patterns
        const possibleAssets = [
          '/assets/index.js',
          '/assets/index.css',
          '/dist/assets/index.js',
          '/dist/assets/index.css'
        ];
        
        const assetsFolder = zip.folder('assets');
        
        for (const assetPath of possibleAssets) {
          try {
            const response = await fetch(assetPath);
            if (response.ok) {
              const content = await response.text();
              const filename = assetPath.split('/').pop();
              if (filename) {
                assetsFolder?.file(filename, content);
                console.log(`Found and added: ${filename}`);
              }
            }
          } catch (error) {
            // Continue trying other paths
          }
        }
        
        // Create a fallback index.html
        const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSV分析結果 - 静的レポート</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
      window.__STATIC_MODE__ = true;
    </script>
    <link rel="stylesheet" href="./assets/index.css">
</head>
<body class="bg-gray-900">
    <div id="root"></div>
    <script src="./assets/index.js"></script>
</body>
</html>`;
        
        zip.file('index.html', indexHtml);
        
      } catch (error) {
        console.error('Failed to collect assets:', error);
        throw error;
      }
    }
    
    onProgress?.({ status: 'zipping', message: 'READMEを追加中...', progress: 70 });
    
    // Add README
    const readme = `# CSV分析結果 - 静的レポート

## 概要
このレポートは、CSV分析ツールで生成された静的バージョンです。

## 使用方法
1. すべてのファイルを同じフォルダに解凍してください
2. index.htmlをWebブラウザで開いてください
3. インターネット接続が必要です（Tailwind CSSのCDNを使用）

## 含まれるデータ
- 生成日時: ${new Date(exportState.timestamp).toLocaleString('ja-JP')}
- 分析済みデータ: ${exportState.analyzedData?.length || 0}件
- 抽出されたトピック: ${exportState.extractedTopics?.length || 0}件
- 選択されたカラム: ${exportState.selectedColumn || 'なし'}

## ファイル構成
├── index.html      - メインファイル
├── assets/         - JavaScript と CSS ファイル
│   ├── index-*.js  - アプリケーションのJavaScript
│   └── index-*.css - スタイルシート
└── README.txt      - このファイル

## 技術情報
- React 19.1.0
- Vite でビルド
- Tailwind CSS (CDN)

## 注意事項
- すべてのファイルを同じ階層に保つ必要があります
- assets フォルダとその中身を削除しないでください
- オフラインでは Tailwind CSS が機能しません
`;
    
    zip.file('README.txt', readme);
    
    onProgress?.({ status: 'zipping', message: 'ZIPファイルを生成中...', progress: 90 });
    
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    
    onProgress?.({ status: 'complete', message: '完了しました！', progress: 100 });
    
    return blob;
    
  } catch (error) {
    console.error('ZIP creation error:', error);
    throw error;
  }
}