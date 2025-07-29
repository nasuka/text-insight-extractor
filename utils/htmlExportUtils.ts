import { AnalyzedRow, TopicWithSubtopics } from '../services/geminiService';

interface ExportOptions {
  title: string;
  analyzedData: AnalyzedRow[];
  topics: TopicWithSubtopics[];
  selectedTopic?: string | null;
  selectedSubTopic?: string | null;
  selectedKptType?: string | null;
  selectedPrefecture?: string | null;
  totalCount: number;
  filteredCount: number;
}

export const generateStaticHTML = (options: ExportOptions): string => {
  const {
    title,
    analyzedData,
    topics,
    selectedTopic,
    selectedSubTopic,
    selectedKptType,
    selectedPrefecture,
    totalCount,
    filteredCount
  } = options;

  const timestamp = new Date().toLocaleString('ja-JP');
  
  // Generate filter summary
  const filterParts = [];
  if (selectedTopic) filterParts.push(`トピック: ${selectedTopic}`);
  if (selectedSubTopic) filterParts.push(`サブトピック: ${selectedSubTopic}`);
  if (selectedKptType) filterParts.push(`KPT: ${selectedKptType}`);
  if (selectedPrefecture) filterParts.push(`都道府県: ${selectedPrefecture}`);
  const filterSummary = filterParts.length > 0 ? filterParts.join(' | ') : 'フィルタなし';

  // Count by topic
  const topicCounts = new Map<string, number>();
  analyzedData.forEach(row => {
    topicCounts.set(row.topic, (topicCounts.get(row.topic) || 0) + 1);
  });

  // Count by KPT type
  const kptCounts = new Map<string, number>();
  analyzedData.forEach(row => {
    if (row.kptType) {
      kptCounts.set(row.kptType, (kptCounts.get(row.kptType) || 0) + 1);
    }
  });

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - 分析結果</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            background-color: #4f46e5;
            color: white;
            padding: 30px 0;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .meta-info {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .summary-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 15px;
        }
        
        .summary-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #4f46e5;
        }
        
        .summary-card h3 {
            color: #4f46e5;
            font-size: 0.9rem;
            margin-bottom: 5px;
        }
        
        .summary-card .value {
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .topics-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .topic-item {
            border-bottom: 1px solid #e5e7eb;
            padding: 15px 0;
        }
        
        .topic-item:last-child {
            border-bottom: none;
        }
        
        .topic-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .topic-name {
            font-weight: bold;
            color: #4f46e5;
            font-size: 1.1rem;
        }
        
        .topic-count {
            background: #e0e7ff;
            color: #4338ca;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.9rem;
        }
        
        .topic-description {
            color: #666;
            margin-bottom: 10px;
            font-size: 0.95rem;
        }
        
        .subtopics {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .subtopic-badge {
            background: #f3f4f6;
            color: #374151;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 0.85rem;
        }
        
        .data-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .data-item {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .data-text {
            margin-bottom: 10px;
            color: #1f2937;
            line-height: 1.5;
        }
        
        .data-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .tag {
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 500;
        }
        
        .tag-topic {
            background: #ddd6fe;
            color: #5b21b6;
        }
        
        .tag-subtopic {
            background: #d1fae5;
            color: #047857;
        }
        
        .tag-keep {
            background: #d1fae5;
            color: #047857;
        }
        
        .tag-problem {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .tag-try {
            background: #dbeafe;
            color: #1d4ed8;
        }
        
        .tag-prefecture {
            background: #e9d5ff;
            color: #7c3aed;
        }
        
        @media print {
            body {
                background: white;
            }
            
            .container {
                max-width: 100%;
            }
            
            .data-item {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>${title}</h1>
            <div class="meta-info">
                <p>エクスポート日時: ${timestamp}</p>
                <p>フィルタ: ${filterSummary}</p>
            </div>
        </div>
    </header>
    
    <div class="container">
        <section class="summary-section">
            <h2>分析サマリー</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>表示データ数</h3>
                    <div class="value">${filteredCount}件</div>
                    <div style="font-size: 0.85rem; color: #666;">（全${totalCount}件中）</div>
                </div>
                ${kptCounts.size > 0 ? `
                <div class="summary-card">
                    <h3>KPT分布</h3>
                    <div style="font-size: 0.9rem;">
                        ${Array.from(kptCounts.entries())
                          .map(([type, count]) => `${type}: ${count}件`)
                          .join('<br>')}
                    </div>
                </div>
                ` : ''}
                <div class="summary-card">
                    <h3>トピック数</h3>
                    <div class="value">${topics.length}個</div>
                </div>
            </div>
        </section>
        
        <section class="topics-section">
            <h2>トピック一覧</h2>
            ${topics.map(topic => {
                const count = topicCounts.get(topic.topic) || 0;
                return `
                <div class="topic-item">
                    <div class="topic-header">
                        <span class="topic-name">${topic.topic}</span>
                        <span class="topic-count">${count}件</span>
                    </div>
                    <div class="topic-description">${topic.description}</div>
                    <div class="subtopics">
                        ${topic.subTopics.map(sub => 
                            `<span class="subtopic-badge">${sub}</span>`
                        ).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        </section>
        
        <section class="data-section">
            <h2>分析データ詳細（${analyzedData.length}件）</h2>
            ${analyzedData.map((row, index) => `
                <div class="data-item">
                    <div class="data-text">${escapeHtml(row.originalText)}</div>
                    <div class="data-tags">
                        <span class="tag tag-topic">📊 ${row.topic}</span>
                        <span class="tag tag-subtopic">🏷️ ${row.subTopic}</span>
                        ${row.kptType ? `<span class="tag tag-${row.kptType.toLowerCase()}">${row.kptType}</span>` : ''}
                        ${row.prefecture ? `<span class="tag tag-prefecture">📍 ${row.prefecture}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </section>
    </div>
</body>
</html>`;

  return html;
};

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export const downloadHTML = (htmlContent: string, filename: string = 'analysis_report.html'): void => {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};