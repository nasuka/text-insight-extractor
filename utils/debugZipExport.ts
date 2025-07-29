import JSZip from 'jszip';
import { ExportState } from './staticExportUtils';

export async function createDebugZip(
  exportState: ExportState,
  onProgress?: (progress: { status: string; message: string; progress?: number }) => void
): Promise<Blob> {
  try {
    const zip = new JSZip();
    
    onProgress?.({ status: 'building', message: 'デバッグ用HTMLを生成中...', progress: 30 });
    
    // Create a simple HTML that logs what's happening
    const debugHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSV分析結果 - 静的レポート</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(exportState)};
      window.__STATIC_MODE__ = true;
      
      // Debug logging
      console.log('Static mode initialized');
      console.log('Initial state:', window.__INITIAL_STATE__);
    </script>
    <style>
      .debug-info {
        background: #1f2937;
        color: white;
        padding: 1rem;
        margin: 1rem;
        border-radius: 0.5rem;
        font-family: monospace;
      }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div id="root">
      <div class="container mx-auto p-8">
        <h1 class="text-3xl font-bold mb-4">静的レポート - デバッグモード</h1>
        
        <div class="debug-info">
          <h2 class="text-xl mb-2">アセットの読み込み状態</h2>
          <p>JavaScript: <span id="js-status">読み込み中...</span></p>
          <p>CSS: <span id="css-status">読み込み中...</span></p>
        </div>
        
        <div class="debug-info mt-4">
          <h2 class="text-xl mb-2">データ情報</h2>
          <p>分析済みデータ: ${exportState.analyzedData?.length || 0}件</p>
          <p>トピック: ${exportState.extractedTopics?.length || 0}件</p>
        </div>
      </div>
    </div>
    
    <!-- アセットを相対パスで読み込み -->
    <link rel="stylesheet" href="assets/index-dxB_Q0YY.css" onload="document.getElementById('css-status').textContent='✅ 成功'" onerror="document.getElementById('css-status').textContent='❌ 失敗: ' + this.href">
    <script src="assets/index-BnjvYU27.js" onload="document.getElementById('js-status').textContent='✅ 成功'" onerror="document.getElementById('js-status').textContent='❌ 失敗: ' + this.src"></script>
    
    <script>
      // Additional debug info
      setTimeout(() => {
        console.log('Current location:', window.location.href);
        console.log('Protocol:', window.location.protocol);
        
        // Try to load assets with different methods
        const testPaths = [
          './assets/index-BnjvYU27.js',
          'assets/index-BnjvYU27.js',
          '/assets/index-BnjvYU27.js'
        ];
        
        testPaths.forEach(path => {
          fetch(path)
            .then(() => console.log('✅ Fetch successful:', path))
            .catch(() => console.log('❌ Fetch failed:', path));
        });
      }, 1000);
    </script>
</body>
</html>`;
    
    zip.file('index.html', debugHtml);
    
    // Get the actual built assets from dist folder
    const assetsFolder = zip.folder('assets');
    
    onProgress?.({ status: 'building', message: 'アセットファイルを収集中...', progress: 50 });
    
    // Try to get the built files
    try {
      // Fetch JavaScript
      const jsResponse = await fetch('/dist/assets/index-BnjvYU27.js');
      if (jsResponse.ok) {
        const jsContent = await jsResponse.text();
        assetsFolder?.file('index-BnjvYU27.js', jsContent);
        console.log('Added JS file successfully');
      }
      
      // Fetch CSS
      const cssResponse = await fetch('/dist/assets/index-dxB_Q0YY.css');
      if (cssResponse.ok) {
        const cssContent = await cssResponse.text();
        assetsFolder?.file('index-dxB_Q0YY.css', cssContent);
        console.log('Added CSS file successfully');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
    
    // Add a test file to verify folder structure
    assetsFolder?.file('test.txt', 'This is a test file to verify the assets folder exists.');
    
    // Add README
    const readme = `# デバッグ情報

## ファイル構造の確認
解凍後、以下の構造になっているか確認してください：

\`\`\`
/
├── index.html
├── assets/
│   ├── index-BnjvYU27.js
│   ├── index-dxB_Q0YY.css
│   └── test.txt
└── README.txt
\`\`\`

## トラブルシューティング

1. **ファイルが見つからない場合**
   - ブラウザの開発者ツールを開いて、Consoleタブを確認
   - どのパスでファイルを探しているか確認

2. **CORSエラーの場合**
   - ローカルサーバーで実行してみてください：
     \`npx serve .\` (解凍したフォルダで実行)

3. **パスの問題**
   - index.htmlファイルの中身を確認
   - src="assets/..." のようになっているか確認
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
    console.error('Debug ZIP creation error:', error);
    throw error;
  }
}