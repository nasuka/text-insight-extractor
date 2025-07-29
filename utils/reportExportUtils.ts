import { AnalyzedRow, TopicWithSubtopics } from '../services/geminiService';

interface ReportExportOptions {
  analyzedData: AnalyzedRow[];
  topics: TopicWithSubtopics[];
  totalCount: number;
  filters: {
    selectedTopic?: string | null;
    selectedSubTopic?: string | null;
    selectedKptType?: string | null;
    selectedPrefecture?: string | null;
  };
  exportDate: Date;
}

export const generateStaticReport = (options: ReportExportOptions): string => {
  const {
    analyzedData,
    topics,
    totalCount,
    filters,
    exportDate
  } = options;

  const timestamp = exportDate.toLocaleString('ja-JP');
  
  // Generate filter summary
  let filterText = '';
  if (filters.selectedTopic || filters.selectedKptType || filters.selectedPrefecture) {
    filterText = `フィルタ: ${filters.selectedTopic || ''}${filters.selectedSubTopic ? ` > ${filters.selectedSubTopic}` : ''}${filters.selectedKptType ? ` [${filters.selectedKptType}]` : ''}${filters.selectedPrefecture ? ` ｜${filters.selectedPrefecture}｜` : ''}`;
  } else {
    filterText = 'すべてのデータ';
  }

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPT分析結果 - ${timestamp}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #111827;
            color: #e5e7eb;
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1024px;
            margin: 0 auto;
            padding: 1rem;
        }
        
        header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem 0;
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: bold;
            color: white;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
        }
        
        .subtitle {
            color: #9ca3af;
            font-size: 0.875rem;
        }
        
        .main-content {
            background: rgba(31, 41, 55, 0.5);
            backdrop-filter: blur(10px);
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            border: 1px solid #374151;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: white;
            border-left: 4px solid #6366f1;
            padding-left: 1rem;
        }
        
        .filter-info {
            padding-left: 1.25rem;
            font-size: 0.875rem;
            color: #9ca3af;
            margin-bottom: 1rem;
        }
        
        .count-badge {
            margin-left: 0.5rem;
            font-family: monospace;
            background-color: #374151;
            color: #e5e7eb;
            font-size: 0.75rem;
            padding: 0.125rem 0.5rem;
            border-radius: 0.25rem;
        }
        
        .topics-section {
            margin-bottom: 2rem;
        }
        
        .topic-card {
            background: rgba(17, 24, 39, 0.5);
            border-radius: 0.5rem;
            border: 1px solid #374151;
            overflow: hidden;
            margin-bottom: 0.75rem;
            transition: all 0.3s ease;
        }
        
        .topic-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            cursor: pointer;
            background: transparent;
            border: none;
            width: 100%;
            text-align: left;
            color: inherit;
        }
        
        .topic-header:hover {
            background: rgba(55, 65, 81, 0.3);
        }
        
        .topic-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: #a5b4fc;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .topic-content {
            padding: 1rem;
            border-top: 1px solid #374151;
            background: rgba(0, 0, 0, 0.1);
        }
        
        .topic-description {
            color: #d1d5db;
            margin-bottom: 1rem;
            padding-left: 0.25rem;
        }
        
        .subtopics {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .subtopic-badge {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.25rem 0.75rem;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 9999px;
            transition: all 0.2s;
            background: rgba(20, 184, 166, 0.1);
            border: 1px solid rgba(20, 184, 166, 0.3);
            color: #5eead4;
        }
        
        .subtopic-badge.active {
            background-color: #14b8a6;
            color: #111827;
            ring: 2px solid #99f6e4;
        }
        
        .data-section {
            margin-top: 2rem;
        }
        
        .data-item {
            background: rgba(17, 24, 39, 0.5);
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid #374151;
            margin-bottom: 0.75rem;
        }
        
        .data-text {
            color: #e5e7eb;
            margin-bottom: 0.75rem;
            line-height: 1.5;
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .tag {
            padding: 0.25rem 0.75rem;
            font-size: 0.75rem;
            font-weight: bold;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            gap: 0.375rem;
        }
        
        .tag-topic {
            background: rgba(99, 102, 241, 0.1);
            color: #a5b4fc;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }
        
        .tag-subtopic {
            background: rgba(20, 184, 166, 0.1);
            color: #5eead4;
            border: 1px solid rgba(20, 184, 166, 0.3);
        }
        
        .tag-keep {
            background: rgba(34, 197, 94, 0.1);
            color: #86efac;
            border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .tag-problem {
            background: rgba(239, 68, 68, 0.1);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .tag-try {
            background: rgba(59, 130, 246, 0.1);
            color: #93c5fd;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .tag-prefecture {
            background: rgba(139, 92, 246, 0.1);
            color: #c4b5fd;
            border: 1px solid rgba(139, 92, 246, 0.3);
        }
        
        .empty-state {
            text-align: center;
            padding: 2.5rem;
            color: #6b7280;
        }
        
        .chevron {
            transition: transform 0.3s;
        }
        
        .chevron.rotate {
            transform: rotate(180deg);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                KPT分析結果
            </h1>
            <p class="subtitle">エクスポート日時: ${timestamp}</p>
        </header>

        <main class="main-content">
            <!-- Topics Section -->
            <div class="topics-section">
                <h2>抽出されたトピック</h2>
                <p style="color: #9ca3af; padding-left: 1.25rem; margin-top: 0.5rem; margin-bottom: 1rem;">
                    トピックをクリックして関連データを表示・フィルタリングします。
                </p>
                <div>
                    ${topics.map((topic, index) => {
                        const topicData = analyzedData.filter(d => d.topic === topic.topic);
                        const count = topicData.length;
                        
                        return `
                        <div class="topic-card">
                            <button class="topic-header" onclick="toggleTopic(${index})">
                                <h3 class="topic-name">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"></path>
                                    </svg>
                                    ${topic.topic}
                                </h3>
                                <svg class="chevron" id="chevron-${index}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                                    <path d="M6 9l6 6 6-6"></path>
                                </svg>
                            </button>
                            <div class="topic-content" id="topic-${index}" style="display: none;">
                                <p class="topic-description">${topic.description}</p>
                                <div class="subtopics">
                                    ${topic.subTopics.map(subTopic => {
                                        const subCount = topicData.filter(d => d.subTopic === subTopic).length;
                                        return `
                                        <span class="subtopic-badge">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M20 7h-8a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2z"></path>
                                                <path d="M14 7V5a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2h2"></path>
                                            </svg>
                                            ${subTopic}${subCount > 0 ? ` (${subCount})` : ''}
                                        </span>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Data Section -->
            <div class="data-section">
                <div class="section-header">
                    <h2>分析結果データ</h2>
                </div>
                <div class="filter-info">
                    ${filterText}
                    <span class="count-badge">${analyzedData.length} / ${totalCount} 件</span>
                </div>
                
                <div>
                    ${analyzedData.length > 0 ? analyzedData.map((row, index) => `
                        <div class="data-item">
                            <p class="data-text">${escapeHtml(row.originalText)}</p>
                            <div class="tags">
                                <span class="tag tag-topic">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="3" y1="9" x2="21" y2="9"></line>
                                        <line x1="9" y1="21" x2="9" y2="9"></line>
                                    </svg>
                                    ${row.topic}
                                </span>
                                <span class="tag tag-subtopic">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path>
                                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                    </svg>
                                    ${row.subTopic}
                                </span>
                                ${row.kptType ? `
                                <span class="tag tag-${row.kptType.toLowerCase()}">
                                    ${row.kptType}
                                </span>
                                ` : ''}
                                ${row.prefecture ? `
                                <span class="tag tag-prefecture">
                                    📍 ${row.prefecture}
                                </span>
                                ` : ''}
                            </div>
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <p>現在のフィルタに一致するデータはありません。</p>
                        </div>
                    `}
                </div>
            </div>
        </main>
    </div>
    
    <script>
        function toggleTopic(index) {
            const content = document.getElementById('topic-' + index);
            const chevron = document.getElementById('chevron-' + index);
            
            if (content.style.display === 'none' || content.style.display === '') {
                content.style.display = 'block';
                chevron.classList.add('rotate');
            } else {
                content.style.display = 'none';
                chevron.classList.remove('rotate');
            }
        }
    </script>
</body>
</html>`;

  return html;
};

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

export const downloadStaticReport = (htmlContent: string, filename: string = 'analysis_report.html'): void => {
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