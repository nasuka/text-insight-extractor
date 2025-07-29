import { AnalyzedRow } from '../services/geminiService';

/**
 * Convert analyzed data to CSV format
 */
export const exportAnalyzedDataToCSV = (data: AnalyzedRow[], originalHeaders: string[]): string => {
  if (data.length === 0) return '';

  // Create headers including the analysis results
  const headers = ['_id', '_originalText', '_topic', '_subTopic'];
  
  // Add KPT and prefecture if they exist
  if (data[0].kptType !== undefined) {
    headers.push('_kptType');
  }
  if (data[0].prefecture !== undefined) {
    headers.push('_prefecture');
  }

  // Add original headers (if any additional data needs to be preserved)
  const csvHeaders = headers.join(',');

  // Create rows
  const csvRows = data.map(row => {
    const values: string[] = [
      escapeCSVValue(row.id),
      escapeCSVValue(row.originalText),
      escapeCSVValue(row.topic),
      escapeCSVValue(row.subTopic)
    ];

    if (row.kptType !== undefined) {
      values.push(escapeCSVValue(row.kptType));
    }
    if (row.prefecture !== undefined) {
      values.push(escapeCSVValue(row.prefecture));
    }

    return values.join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCSVValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  
  const stringValue = String(value);
  
  // If value contains comma, quotes, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent: string, filename: string = 'analyzed_data.csv'): void => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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

/**
 * Check if CSV contains analysis results (has required columns)
 */
export const isAnalyzedCSV = (headers: string[]): boolean => {
  const requiredColumns = ['_id', '_originalText', '_topic', '_subTopic'];
  return requiredColumns.every(col => headers.includes(col));
};

/**
 * Parse analyzed CSV and reconstruct AnalyzedRow data
 */
export const parseAnalyzedCSV = (headers: string[], rows: string[][]): AnalyzedRow[] => {
  const idIndex = headers.indexOf('_id');
  const textIndex = headers.indexOf('_originalText');
  const topicIndex = headers.indexOf('_topic');
  const subTopicIndex = headers.indexOf('_subTopic');
  const kptIndex = headers.indexOf('_kptType');
  const prefectureIndex = headers.indexOf('_prefecture');

  if (idIndex === -1 || textIndex === -1 || topicIndex === -1 || subTopicIndex === -1) {
    throw new Error('必要な分析結果列が見つかりません');
  }

  return rows.map(row => {
    const analyzedRow: AnalyzedRow = {
      id: row[idIndex] || '',
      originalText: row[textIndex] || '',
      topic: row[topicIndex] || '',
      subTopic: row[subTopicIndex] || ''
    };

    if (kptIndex !== -1 && row[kptIndex]) {
      analyzedRow.kptType = row[kptIndex];
    }

    if (prefectureIndex !== -1 && row[prefectureIndex]) {
      analyzedRow.prefecture = row[prefectureIndex];
    }

    return analyzedRow;
  });
};

/**
 * Extract unique topics from analyzed data
 */
export const extractTopicsFromAnalyzedData = (data: AnalyzedRow[]): Array<{topic: string, subTopics: string[]}> => {
  const topicsMap = new Map<string, Set<string>>();

  data.forEach(row => {
    if (row.topic && row.subTopic) {
      if (!topicsMap.has(row.topic)) {
        topicsMap.set(row.topic, new Set());
      }
      topicsMap.get(row.topic)!.add(row.subTopic);
    }
  });

  return Array.from(topicsMap.entries()).map(([topic, subTopicsSet]) => ({
    topic,
    subTopics: Array.from(subTopicsSet)
  }));
};