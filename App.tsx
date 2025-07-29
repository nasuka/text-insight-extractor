import React, { useState, useCallback, useMemo } from 'react';
import { extractKeywordsFromText, extractTopicsAndSubtopics, assignTopicsToData } from './services/geminiService';
import type { TopicWithSubtopics, AnalyzedRow, TextWithId } from './services/geminiService';
import { UploadIcon, SparklesIcon, ChevronDownIcon, FileIcon, ListBulletIcon, TagIcon } from './components/IconComponents';
import { LoadingSpinner } from './components/LoadingSpinner';

type AnalysisType = 'keywords' | 'topics';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  
  const [keywords, setKeywords] = useState<string[]>([]);
  const [extractedTopics, setExtractedTopics] = useState<TopicWithSubtopics[]>([]);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedRow[]>([]);
  
  const [analysisType, setAnalysisType] = useState<AnalysisType>('keywords');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(null);
  const [selectedKptType, setSelectedKptType] = useState<string | null>(null);
  const [preAnalysisKptFilter, setPreAnalysisKptFilter] = useState<string[]>([]);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setSelectedColumn('');
    setKeywords([]);
    setExtractedTopics([]);
    setAnalyzedData([]);
    setError(null);
    setIsLoading(false);
    setAnalysisStatus('');
    setSelectedTopic(null);
    setSelectedSubTopic(null);
    setSelectedKptType(null);
    setPreAnalysisKptFilter([]);
    setSelectedPrefecture(null);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'text/csv') {
      resetState();
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          const allRows = text.split(/\r?\n/).filter(row => row.trim() !== '');
          if (allRows.length > 0) {
            const headerRow = parseCSVLine(allRows[0]);
            const dataRows = allRows.slice(1).map(row => parseCSVLine(row));
            setHeaders(headerRow);
            setRows(dataRows);
            if (headerRow.length > 0) {
                setSelectedColumn(headerRow[0]);
            }
          } else {
            setError("CSVファイルが空か、または無効な形式です。");
          }
        }
      };
      reader.onerror = () => {
        setError("ファイルの読み込み中にエラーが発生しました。");
      };
      reader.readAsText(uploadedFile, 'UTF-8');
    } else {
      resetState();
      setError("CSVファイルをアップロードしてください。");
    }
    event.target.value = ''; // Reset file input
  };

  const handleAnalyzeClick = useCallback(async () => {
    if (rows.length === 0) {
      setError("分析するデータがありません。CSVファイルをアップロードしてください。");
      return;
    }
    if ((analysisType === 'keywords' || analysisType === 'topics') && !selectedColumn) {
        setError("分析する列を選択してください。");
        return;
    }
    
    // kpt_typeでフィルタリング
    let filteredRows = rows;
    const kptTypeIndex = headers.findIndex(h => h.toLowerCase() === 'kpt_type');
    if (kptTypeIndex !== -1 && preAnalysisKptFilter.length > 0) {
      filteredRows = rows.filter(row => preAnalysisKptFilter.includes(row[kptTypeIndex]));
      if (filteredRows.length === 0) {
        setError("選択されたKPT Typeに一致するデータがありません。");
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setKeywords([]);
    setExtractedTopics([]);
    setAnalyzedData([]);
    setSelectedTopic(null);
    setSelectedSubTopic(null);

    try {
      if (analysisType === 'keywords') {
        const columnIndex = headers.findIndex(h => h === selectedColumn);
        if (columnIndex === -1) {
          throw new Error("選択された列が見つかりません。");
        }
        const columnDataArray = filteredRows.map(row => row[columnIndex]).filter(Boolean);
        const columnDataString = columnDataArray.join('\n');
        if (!columnDataString.trim()) {
          throw new Error("選択された列には分析可能なテキストデータがありません。");
        }
        
        setAnalysisStatus('キーワードを抽出中...');
        const extractedKeywords = await extractKeywordsFromText(columnDataString);
        setKeywords(extractedKeywords);
      } else { // Topic Analysis
        const columnIndex = headers.findIndex(h => h === selectedColumn);
        if (columnIndex === -1) {
          throw new Error("選択された列が見つかりません。");
        }
        // ID付きのテキストデータを作成
        const textsWithIds: TextWithId[] = [];
        filteredRows.forEach((row, index) => {
          const text = row[columnIndex]?.trim();
          if (text) {
            textsWithIds.push({
              id: `row-${index}`,
              text: text
            });
          }
        });

        if (textsWithIds.length === 0) {
            throw new Error("選択された列には分析可能なテキストデータがありません。");
        }
        const allText = textsWithIds.map(item => item.text).join('\n');

        setAnalysisStatus('トピックとサブトピックを抽出中...');
        const topicsResult = await extractTopicsAndSubtopics(allText);
        setExtractedTopics(topicsResult);
        
        if (topicsResult.length > 0) {
          setAnalysisStatus('各データにトピックを割り当て中... (0%)');
          const assignments = await assignTopicsToData(
            textsWithIds,
            topicsResult,
            (progress: number) => {
              setAnalysisStatus(`各データにトピックを割り当て中... (${progress}%)`);
            }
          );
          
          // kpt_type列と都道府県列の値を追加
          const prefectureIndex = headers.findIndex(h => h === '都道府県' || h.toLowerCase() === 'prefecture');
          const enrichedAssignments = assignments.map((assignment) => {
            // IDから元の行インデックスを取得
            const rowIndex = parseInt(assignment.id.replace('row-', ''), 10);
            if (!isNaN(rowIndex) && rowIndex < filteredRows.length && filteredRows[rowIndex]) {
              const enriched: AnalyzedRow = { ...assignment };
              if (kptTypeIndex !== -1) {
                enriched.kptType = filteredRows[rowIndex][kptTypeIndex];
              }
              if (prefectureIndex !== -1) {
                enriched.prefecture = filteredRows[rowIndex][prefectureIndex];
              }
              return enriched;
            }
            return assignment;
          });
          setAnalyzedData(enrichedAssignments);
        } else {
          setError("テキストからトピックを抽出できませんでした。");
        }
      }

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "分析中に不明なエラーが発生しました。";
      setError(`エラー: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setAnalysisStatus('');
    }
  }, [selectedColumn, rows, headers, analysisType, preAnalysisKptFilter]);

  const filteredData = useMemo(() => {
    let data = analyzedData;
    
    if (selectedTopic) {
      data = data.filter(d => d.topic === selectedTopic);
    }
    if (selectedSubTopic) {
      data = data.filter(d => d.subTopic === selectedSubTopic);
    }
    if (selectedKptType) {
      data = data.filter(d => d.kptType === selectedKptType);
    }
    if (selectedPrefecture) {
      data = data.filter(d => d.prefecture === selectedPrefecture);
    }
    
    return data;
  }, [analyzedData, selectedTopic, selectedSubTopic, selectedKptType, selectedPrefecture]);
  
  // kpt_type列が存在するかチェック
  const hasKptType = useMemo(() => {
    return headers.some(h => h.toLowerCase() === 'kpt_type');
  }, [headers]);
  
  // 都道府県列が存在するかチェック
  const hasPrefecture = useMemo(() => {
    return headers.some(h => h === '都道府県' || h.toLowerCase() === 'prefecture');
  }, [headers]);
  
  // 利用可能なkpt_typeの値とその件数を取得
  const kptTypesWithCount = useMemo(() => {
    if (!hasKptType) return [];
    const kptTypeIndex = headers.findIndex(h => h.toLowerCase() === 'kpt_type');
    if (kptTypeIndex === -1) return [];
    
    const typeCounts = new Map<string, number>();
    rows.forEach(row => {
      if (row[kptTypeIndex]) {
        const type = row[kptTypeIndex];
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
    });
    
    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count); // 件数の多い順にソート
  }, [headers, rows, hasKptType]);
  
  // 利用可能な都道府県のリストを取得
  const availablePrefectures = useMemo(() => {
    if (!analyzedData.length) return [];
    const prefectures = new Set<string>();
    analyzedData.forEach(row => {
      if (row.prefecture) {
        prefectures.add(row.prefecture);
      }
    });
    return Array.from(prefectures).sort();
  }, [analyzedData]);

  const analysisOptions: { id: AnalysisType; label: string; icon: React.FC<any> }[] = [
    { id: 'keywords', label: 'キーワード抽出', icon: SparklesIcon },
    { id: 'topics', label: 'トピック分析', icon: ListBulletIcon },
  ];

  const buttonText = analysisType === 'keywords' ? 'キーワードを抽出' : 'トピックを分析';
  const ButtonIcon = analysisType === 'keywords' ? SparklesIcon : ListBulletIcon;
  const showColumnSelector = analysisType === 'keywords' || analysisType === 'topics';
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <SparklesIcon className="w-10 h-10 text-indigo-400" />
            CSV Insight Extractor
          </h1>
          <p className="text-lg text-gray-400">
            CSVをアップロードし、AIでキーワード抽出やトピック分析を行います。
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 space-y-8">
          
          <div className="space-y-4">
             <h2 className="text-2xl font-semibold text-white border-l-4 border-indigo-500 pl-4">ステップ1: CSVファイルをアップロード</h2>
            <label
              htmlFor="file-upload"
              className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-400">
                  <span className="font-semibold text-indigo-400">クリックしてアップロード</span> またはドラッグ＆ドロップ
                </p>
                <p className="text-xs text-gray-500">CSV (UTF-8)</p>
              </div>
              <input id="file-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
            </label>
            {file && (
              <div className="flex items-center justify-center text-center p-3 bg-green-900/50 border border-green-700 rounded-lg">
                <FileIcon className="w-5 h-5 mr-3 text-green-400 flex-shrink-0" />
                <span className="text-green-300 font-medium truncate">{file.name}</span>
              </div>
            )}
          </div>

          {headers.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white border-l-4 border-indigo-500 pl-4">ステップ2: 分析</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  分析の種類を選択
                </label>
                <div className="flex w-full bg-gray-700/50 rounded-lg p-1 border border-gray-600">
                  {analysisOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setAnalysisType(option.id)}
                      className={`w-1/2 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                        analysisType === option.id
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-gray-300 hover:bg-gray-600/50'
                      }`}
                      aria-pressed={analysisType === option.id}
                    >
                      <option.icon className="w-5 h-5" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasKptType && kptTypesWithCount.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">
                      KPT Typeでフィルタリング（複数選択可）
                    </label>
                    {preAnalysisKptFilter.length > 0 && (
                      <button
                        onClick={() => setPreAnalysisKptFilter([])}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        すべてクリア ({preAnalysisKptFilter.length}件選択中)
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {kptTypesWithCount.map(({ type: kptType, count }) => (
                        <button
                          key={kptType}
                          onClick={() => {
                            setPreAnalysisKptFilter(prev => 
                              prev.includes(kptType) 
                                ? prev.filter(t => t !== kptType)
                                : [...prev, kptType]
                            );
                          }}
                          className={`relative px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 text-left ${
                            preAnalysisKptFilter.includes(kptType)
                              ? kptType === 'Keep' ? 'bg-green-600/20 text-green-300 ring-2 ring-green-500' : 
                                kptType === 'Problem' ? 'bg-red-600/20 text-red-300 ring-2 ring-red-500' : 
                                kptType === 'Try' ? 'bg-blue-600/20 text-blue-300 ring-2 ring-blue-500' :
                                'bg-indigo-600/20 text-indigo-300 ring-2 ring-indigo-500'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate pr-2">{kptType}</span>
                            <span className={`text-xs font-mono ${
                              preAnalysisKptFilter.includes(kptType) ? 'font-bold' : 'text-gray-400'
                            }`}>
                              {count}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {preAnalysisKptFilter.length > 0 && (
                    <div className="mt-2 text-xs text-gray-400">
                      <span>選択中: </span>
                      <span className="font-mono">
                        {preAnalysisKptFilter.map(type => {
                          const item = kptTypesWithCount.find(k => k.type === type);
                          return item ? `${type} (${item.count})` : type;
                        }).join(', ')}
                      </span>
                      <span className="ml-2 text-indigo-400">
                        合計: {kptTypesWithCount
                          .filter(k => preAnalysisKptFilter.includes(k.type))
                          .reduce((sum, k) => sum + k.count, 0)}件
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className={`grid ${showColumnSelector ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-4 items-end`}>
                {showColumnSelector && (
                    <div>
                      <label htmlFor="column-select" className="block text-sm font-medium text-gray-300 mb-1">
                        分析する列を選択
                      </label>
                      <div className="relative">
                        <select
                          id="column-select"
                          value={selectedColumn}
                          onChange={(e) => setSelectedColumn(e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 text-base bg-gray-700 border border-gray-600 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
                        >
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="w-5 h-5 absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                      </div>
                    </div>
                )}

                <button
                  onClick={handleAnalyzeClick}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center px-4 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-indigo-900/50 disabled:cursor-not-allowed transition-all duration-200`}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner className="w-5 h-5 mr-3" />
                      {analysisStatus || '分析中...'}
                    </>
                  ) : (
                    <>
                      <ButtonIcon className="w-5 h-5 mr-2" />
                      {buttonText}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && <div className="p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-lg text-center">{error}</div>}
          
          <div className="space-y-8">
            {keywords.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white border-l-4 border-indigo-500 pl-4">抽出されたキーワード</h2>
                <div className="flex flex-wrap gap-3 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  {keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm font-medium rounded-full hover:bg-indigo-500/20 transition-colors"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {extractedTopics.length > 0 && (
               <div className="space-y-4">
                 <h2 className="text-2xl font-semibold text-white border-l-4 border-indigo-500 pl-4">抽出されたトピック</h2>
                 <p className="text-gray-400 pl-5">トピックをクリックして関連データを表示・フィルタリングします。</p>
                 <div className="space-y-3">
                   {extractedTopics.map((item) => (
                     <div key={item.topic} className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden transition-all duration-300">
                       <button
                         onClick={() => {
                           setSelectedTopic(prev => (prev === item.topic ? null : item.topic));
                           setSelectedSubTopic(null); // Reset sub-topic when topic accordion is toggled
                         }}
                         className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-700/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                         aria-expanded={selectedTopic === item.topic}
                       >
                         <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                           <ListBulletIcon className="w-5 h-5"/> {item.topic}
                         </h3>
                         <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${selectedTopic === item.topic ? 'rotate-188' : ''}`} />
                       </button>
                       {selectedTopic === item.topic && (
                         <div className="p-4 border-t border-gray-700 bg-black/10">
                           <p className="text-gray-300 mb-4 pl-1">{item.description}</p>
                           <div className="flex flex-wrap gap-2">
                             {item.subTopics.map((subTopic) => (
                               <button
                                 key={subTopic}
                                 onClick={() => setSelectedSubTopic(prev => (prev === subTopic ? null : subTopic))}
                                 className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${
                                   selectedSubTopic === subTopic
                                     ? 'bg-teal-400 text-gray-900 ring-2 ring-teal-300'
                                     : 'bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20'
                                 }`}
                               >
                                 <TagIcon className="w-4 h-4" />
                                 {subTopic}
                               </button>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}

            {analyzedData.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white border-l-4 border-indigo-500 pl-4">分析結果データ</h2>
                <div className="pl-5 text-sm text-gray-400">
                    {
                        selectedTopic || selectedKptType || selectedPrefecture
                        ? `フィルタ: ${selectedTopic || ''}${selectedSubTopic ? ` > ${selectedSubTopic}` : ''}${selectedKptType ? ` [${selectedKptType}]` : ''}${selectedPrefecture ? ` ｜${selectedPrefecture}｜` : ''}`
                        : 'すべてのデータ'
                    }
                    <span className="ml-2 font-mono bg-gray-700 text-gray-200 text-xs px-2 py-0.5 rounded">{filteredData.length} / {analyzedData.length} 件</span>
                </div>
                
                <div className="pl-5 mb-4 space-y-3">
                  {hasKptType && analyzedData.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-300">KPT Type:</span>
                        <button
                          onClick={() => setSelectedKptType(null)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                            !selectedKptType
                              ? 'bg-gray-600 text-white'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          すべて
                        </button>
                        {['Keep', 'Problem', 'Try'].map(kptType => {
                          const count = analyzedData.filter(d => d.kptType === kptType).length;
                          if (count === 0) return null;
                          return (
                            <button
                              key={kptType}
                              onClick={() => setSelectedKptType(prev => prev === kptType ? null : kptType)}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                                selectedKptType === kptType
                                  ? kptType === 'Keep' ? 'bg-green-600 text-white' : 
                                    kptType === 'Problem' ? 'bg-red-600 text-white' : 
                                    'bg-blue-600 text-white'
                                  : kptType === 'Keep' ? 'bg-green-700/30 text-green-400 hover:bg-green-700/50' :
                                    kptType === 'Problem' ? 'bg-red-700/30 text-red-400 hover:bg-red-700/50' :
                                    'bg-blue-700/30 text-blue-400 hover:bg-blue-700/50'
                              }`}
                            >
                              {kptType} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {availablePrefectures.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm text-gray-300">都道府県:</span>
                        <button
                          onClick={() => setSelectedPrefecture(null)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                            !selectedPrefecture
                              ? 'bg-gray-600 text-white'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          すべて
                        </button>
                        <select
                          value={selectedPrefecture || ''}
                          onChange={(e) => setSelectedPrefecture(e.target.value || null)}
                          className="px-3 py-1 text-xs bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">都道府県を選択</option>
                          {availablePrefectures.map(pref => {
                            const count = analyzedData.filter(d => d.prefecture === pref).length;
                            return (
                              <option key={pref} value={pref}>
                                {pref} ({count}件)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-3 rounded-lg">
                  {filteredData.map((row, index) => (
                    <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 animate-fade-in">
                      <p className="text-gray-200 mb-3">{row.originalText}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30">
                          <ListBulletIcon className="w-3.5 h-3.5"/>
                          {row.topic}
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 text-teal-300 text-xs font-bold rounded-full border border-teal-500/30">
                          <TagIcon className="w-3.5 h-3.5"/>
                          {row.subTopic}
                        </span>
                        {row.kptType && (
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            row.kptType === 'Keep' ? 'bg-green-500/10 text-green-300 border border-green-500/30' :
                            row.kptType === 'Problem' ? 'bg-red-500/10 text-red-300 border border-red-500/30' :
                            row.kptType === 'Try' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' :
                            'bg-gray-500/10 text-gray-300 border border-gray-500/30'
                          }`}>
                            {row.kptType}
                          </span>
                        )}
                        {row.prefecture && (
                          <span className="px-3 py-1 bg-purple-500/10 text-purple-300 text-xs font-bold rounded-full border border-purple-500/30">
                            📍 {row.prefecture}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredData.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
                          <p>現在のフィルタに一致するデータはありません。</p>
                      </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;