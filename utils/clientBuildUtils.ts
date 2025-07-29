import JSZip from 'jszip';

interface BuildProgress {
  status: 'idle' | 'building' | 'zipping' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export async function createStaticBuildFromClient(
  exportState: any,
  onProgress?: (progress: BuildProgress) => void
): Promise<Blob> {
  try {
    // Step 1: Prepare the export state
    onProgress?.({ status: 'building', message: '分析データを準備中...', progress: 10 });
    
    // Step 2: Get the current page HTML
    onProgress?.({ status: 'building', message: '静的HTMLを生成中...', progress: 30 });
    
    // Clone the current DOM
    const htmlContent = document.documentElement.outerHTML;
    
    // Create a parser to modify the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Remove script tags that load dynamic content
    const scripts = doc.querySelectorAll('script[type="module"]');
    scripts.forEach(script => script.remove());
    
    // Remove vite-specific elements
    const viteClient = doc.querySelector('script[src*="/@vite/client"]');
    if (viteClient) viteClient.remove();
    
    // Add the state script
    const stateScript = doc.createElement('script');
    stateScript.textContent = `
      window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
      window.__STATIC_MODE__ = true;
    `;
    doc.head.appendChild(stateScript);
    
    // Get all script and link tags
    const scriptTags = document.querySelectorAll('script[src]');
    const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
    
    // Step 3: Create the ZIP structure
    onProgress?.({ status: 'zipping', message: 'ファイルを収集中...', progress: 50 });
    
    const zip = new JSZip();
    const assetsFolder = zip.folder('assets');
    
    // Debug logging
    console.log('Found script tags:', scriptTags.length);
    console.log('Found link tags:', linkTags.length);
    
    // Process JavaScript files
    for (const script of scriptTags) {
      const src = (script as HTMLScriptElement).src;
      console.log('Processing script:', src);
      
      // Skip external CDN scripts and vite client
      if (src.includes('cdn.') || src.includes('/@vite/') || !src.includes(window.location.origin)) {
        continue;
      }
      
      const url = new URL(src);
      const pathname = url.pathname;
      
      // Handle both /assets/ and other paths
      if (pathname.includes('/assets/') || pathname.endsWith('.js')) {
        const filename = pathname.split('/').pop() || 'script.js';
        try {
          const response = await fetch(src);
          const content = await response.text();
          assetsFolder?.file(filename, content);
          console.log('Added JS file:', filename);
          
          // Update the script src in the HTML doc
          const originalSrc = script.getAttribute('src');
          const scriptInDoc = doc.querySelector(`script[src="${originalSrc}"]`);
          if (scriptInDoc) {
            scriptInDoc.setAttribute('src', `./assets/${filename}`);
          }
        } catch (error) {
          console.error(`Failed to fetch ${src}:`, error);
        }
      }
    }
    
    // Process CSS files
    for (const link of linkTags) {
      const href = (link as HTMLLinkElement).href;
      console.log('Processing link:', href);
      
      // Skip external CDN styles
      if (href.includes('cdn.') || !href.includes(window.location.origin)) {
        continue;
      }
      
      const url = new URL(href);
      const pathname = url.pathname;
      
      // Handle both /assets/ and other paths
      if (pathname.includes('/assets/') || pathname.endsWith('.css')) {
        const filename = pathname.split('/').pop() || 'style.css';
        try {
          const response = await fetch(href);
          const content = await response.text();
          assetsFolder?.file(filename, content);
          console.log('Added CSS file:', filename);
          
          // Update the link href in the HTML doc
          const originalHref = link.getAttribute('href');
          const linkInDoc = doc.querySelector(`link[href="${originalHref}"]`);
          if (linkInDoc) {
            linkInDoc.setAttribute('href', `./assets/${filename}`);
          }
        } catch (error) {
          console.error(`Failed to fetch ${href}:`, error);
        }
      }
    }
    
    // If in development mode, we need to build the assets first
    if (import.meta.env.DEV) {
      console.log('Development mode detected - assets may not be built yet');
      
      // Get the current index.tsx module
      try {
        const moduleResponse = await fetch('/index.tsx');
        if (moduleResponse.ok) {
          const moduleContent = await moduleResponse.text();
          
          // Create a simple bundled version
          const bundledJs = `
// Static build generated on ${new Date().toISOString()}
(function() {
  // React and dependencies would normally be bundled here
  // For development builds, ensure you run 'npm run build' first
  console.log('Static site loaded');
  
  // Check for initial state
  if (window.__INITIAL_STATE__ && window.__STATIC_MODE__) {
    console.log('Running in static mode with pre-loaded data');
  }
})();
`;
          assetsFolder?.file('index.js', bundledJs);
          
          // Add a script tag for our bundled JS
          const bundleScript = doc.createElement('script');
          bundleScript.src = './assets/index.js';
          bundleScript.defer = true;
          doc.body.appendChild(bundleScript);
        }
      } catch (error) {
        console.error('Failed to create bundled JS:', error);
      }
    }
    
    // Step 4: Finalize the HTML
    onProgress?.({ status: 'zipping', message: '静的HTMLを最適化中...', progress: 70 });
    
    // Serialize the modified HTML
    const finalHtml = doc.documentElement.outerHTML;
    
    // Add the HTML to the ZIP
    zip.file('index.html', finalHtml);
    
    // Add a README
    const readme = `# 静的分析レポート

このフォルダには、CSV分析結果の静的バージョンが含まれています。

## 使用方法
1. index.htmlをWebブラウザで開いてください
2. インターネット接続が必要です（Tailwind CSSのCDNを使用）
3. すべてのデータと分析結果が含まれています

## 生成日時
${new Date().toLocaleString('ja-JP')}

## 含まれるデータ
- 分析済みアイテム: ${exportState.analyzedData?.length || 0}件
- 抽出されたトピック: ${exportState.extractedTopics?.length || 0}件

## ファイル構成
- index.html: メインの表示ファイル
- assets/: JavaScript と CSS ファイル

## 注意事項
- このレポートはスタンドアロンで動作します
- APIキーは含まれていないため、新たな分析はできません
- フィルタリング機能は引き続き利用可能です
`;
    
    zip.file('README.txt', readme);
    
    // Step 5: Generate the ZIP
    onProgress?.({ status: 'zipping', message: 'ZIPファイルを生成中...', progress: 90 });
    
    const blob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6
      }
    });
    
    onProgress?.({ status: 'complete', message: '完了しました！', progress: 100 });
    return blob;
    
  } catch (error) {
    onProgress?.({ 
      status: 'error', 
      message: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    });
    throw error;
  }
}