import { AnalyzedRow, TopicWithSubtopics } from '../services/geminiService';

export interface ExportState {
  analyzedData: AnalyzedRow[];
  extractedTopics: TopicWithSubtopics[];
  headers: string[];
  rows: string[][];
  selectedColumn: string;
  timestamp: string;
  filters?: {
    selectedTopic?: string | null;
    selectedSubTopic?: string | null;
    selectedKptType?: string | null;
    selectedPrefecture?: string | null;
  };
}

/**
 * Save the current analysis state to localStorage for static export
 */
export const saveExportState = (state: ExportState): void => {
  const stateWithTimestamp = {
    ...state,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('exportedAnalysisState', JSON.stringify(stateWithTimestamp));
  
  // Also save to a file for build process (in development only)
  if (import.meta.env.DEV) {
    fetch('/api/save-export-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateWithTimestamp)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        console.log('✅ Export state saved successfully');
      }
    })
    .catch(error => {
      console.error('❌ Failed to save export state:', error);
    });
  }
};

/**
 * Load exported state from localStorage
 */
export const loadExportState = (): ExportState | null => {
  const saved = localStorage.getItem('exportedAnalysisState');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to parse exported state:', error);
    return null;
  }
};

/**
 * Generate initialization script for static export
 */
export const generateInitScript = (state: ExportState): string => {
  return `
    <script>
      // Injected analysis state
      window.__INITIAL_STATE__ = ${JSON.stringify(state)};
    </script>
  `;
};

/**
 * Create a static export bundle
 */
export const createStaticExportBundle = async (state: ExportState): Promise<Blob> => {
  // This would normally use a build tool, but for now we'll create a simple implementation
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPT分析結果 - ${new Date(state.timestamp).toLocaleDateString('ja-JP')}</title>
    <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(state)};
      window.__STATIC_MODE__ = true;
    </script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
  `;
  
  return new Blob([htmlTemplate], { type: 'text/html' });
};