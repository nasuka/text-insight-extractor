import JSZip from 'jszip';
import { ExportState } from './staticExportUtils';

export async function createStaticBuildWithAssets(
  exportState: ExportState,
  onProgress?: (progress: { status: string; message: string; progress?: number }) => void
): Promise<Blob> {
  try {
    onProgress?.({ status: 'building', message: 'ビルドを準備中...', progress: 10 });
    
    // First, we need to build the project
    onProgress?.({ status: 'building', message: 'プロジェクトをビルド中...', progress: 20 });
    
    // Create a temporary build using vite
    const buildResponse = await fetch('/api/build-static', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportState })
    }).catch(() => null);
    
    if (!buildResponse || !buildResponse.ok) {
      // Fallback: Use the current page approach
      onProgress?.({ status: 'building', message: '代替方法でビルド中...', progress: 30 });
      
      // Get the current built assets from the production build
      const zip = new JSZip();
      
      // Create the HTML with embedded state
      const htmlTemplate = `<!DOCTYPE html>
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
    <style>
      /* Loading spinner */
      .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 20px auto;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background-color: #111827;
        color: white;
      }
    </style>
</head>
<body class="bg-gray-900">
    <div id="root">
      <div class="loading-container">
        <div class="spinner"></div>
        <p class="mt-4 text-gray-400">データを読み込み中...</p>
      </div>
    </div>
    
    <script>
      // Simple static renderer
      document.addEventListener('DOMContentLoaded', function() {
        const state = window.__INITIAL_STATE__;
        if (!state) {
          document.getElementById('root').innerHTML = '<div class="min-h-screen bg-gray-900 text-white flex items-center justify-center"><p>データが見つかりません</p></div>';
          return;
        }
        
        // Build the static content
        let html = '<div class="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8">';
        html += '<div class="max-w-6xl mx-auto">';
        
        // Header
        html += '<header class="text-center mb-8">';
        html += '<h1 class="text-4xl font-bold text-white mb-2">CSV分析結果レポート</h1>';
        html += '<p class="text-gray-400">生成日時: ' + new Date(state.timestamp).toLocaleString('ja-JP') + '</p>';
        html += '</div>';
        
        // Summary
        html += '<div class="bg-gray-800 rounded-lg p-6 mb-6">';
        html += '<h2 class="text-2xl font-semibold text-white mb-4">サマリー</h2>';
        html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
        html += '<div class="bg-gray-700 rounded p-4"><h3 class="text-lg font-medium text-gray-300">分析済みデータ</h3><p class="text-2xl font-bold text-white">' + (state.analyzedData?.length || 0) + '件</p></div>';
        html += '<div class="bg-gray-700 rounded p-4"><h3 class="text-lg font-medium text-gray-300">抽出トピック</h3><p class="text-2xl font-bold text-white">' + (state.extractedTopics?.length || 0) + '件</p></div>';
        html += '<div class="bg-gray-700 rounded p-4"><h3 class="text-lg font-medium text-gray-300">選択カラム</h3><p class="text-xl font-bold text-white">' + (state.selectedColumn || 'なし') + '</p></div>';
        html += '</div>';
        html += '</div>';
        
        // Topics
        if (state.extractedTopics && state.extractedTopics.length > 0) {
          html += '<div class="bg-gray-800 rounded-lg p-6 mb-6">';
          html += '<h2 class="text-2xl font-semibold text-white mb-4">抽出されたトピック</h2>';
          html += '<div class="space-y-4">';
          
          state.extractedTopics.forEach(topic => {
            html += '<div class="bg-gray-700 rounded-lg p-4">';
            html += '<h3 class="text-lg font-semibold text-indigo-400 mb-2">' + topic.topic + '</h3>';
            html += '<p class="text-gray-300 mb-3">' + topic.description + '</p>';
            if (topic.subTopics && topic.subTopics.length > 0) {
              html += '<div class="flex flex-wrap gap-2">';
              topic.subTopics.forEach(sub => {
                html += '<span class="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm rounded-full">' + sub + '</span>';
              });
              html += '</div>';
            }
            html += '</div>';
          });
          
          html += '</div>';
          html += '</div>';
        }
        
        // Data
        if (state.analyzedData && state.analyzedData.length > 0) {
          html += '<div class="bg-gray-800 rounded-lg p-6">';
          html += '<h2 class="text-2xl font-semibold text-white mb-4">分析データ</h2>';
          html += '<div class="space-y-3 max-h-[600px] overflow-y-auto">';
          
          state.analyzedData.forEach((item, index) => {
            html += '<div class="bg-gray-700 rounded-lg p-4">';
            html += '<p class="text-gray-200 mb-2">' + item.originalText + '</p>';
            html += '<div class="flex flex-wrap gap-2">';
            html += '<span class="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">' + item.topic + '</span>';
            html += '<span class="px-3 py-1 bg-teal-500/20 text-teal-300 text-xs rounded-full">' + item.subTopic + '</span>';
            if (item.kptType) {
              const kptColor = item.kptType === 'Keep' ? 'green' : item.kptType === 'Problem' ? 'red' : 'blue';
              html += '<span class="px-3 py-1 bg-' + kptColor + '-500/20 text-' + kptColor + '-300 text-xs rounded-full">' + item.kptType + '</span>';
            }
            if (item.prefecture) {
              html += '<span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">📍 ' + item.prefecture + '</span>';
            }
            html += '</div>';
            html += '</div>';
          });
          
          html += '</div>';
          html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        document.getElementById('root').innerHTML = html;
      });
    </script>
</body>
</html>`;
      
      zip.file('index.html', htmlTemplate);
      
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
1. index.htmlをWebブラウザで開いてください
2. インターネット接続が必要です（Tailwind CSSのCDNを使用）

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
      
      onProgress?.({ status: 'zipping', message: 'ZIPファイルを生成中...', progress: 90 });
      
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      onProgress?.({ status: 'complete', message: '完了しました！', progress: 100 });
      return blob;
    }
    
    // If we have a build response, use it
    const blob = await buildResponse.blob();
    onProgress?.({ status: 'complete', message: '完了しました！', progress: 100 });
    return blob;
    
  } catch (error) {
    console.error('Static build error:', error);
    throw error;
  }
}