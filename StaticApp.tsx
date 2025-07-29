import React, { useState, useMemo, useEffect } from 'react';
import type { TopicWithSubtopics, AnalyzedRow } from './services/geminiService';
import { SparklesIcon, ChevronDownIcon, ListBulletIcon, TagIcon } from './components/IconComponents';
import { ExportState } from './utils/staticExportUtils';

interface StaticAppProps {
  initialState: ExportState;
}

const StaticApp: React.FC<StaticAppProps> = ({ initialState }) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(initialState.filters?.selectedTopic || null);
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | null>(initialState.filters?.selectedSubTopic || null);
  const [selectedKptType, setSelectedKptType] = useState<string | null>(initialState.filters?.selectedKptType || null);
  const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(initialState.filters?.selectedPrefecture || null);
  
  const analyzedData = initialState.analyzedData;
  const extractedTopics = initialState.extractedTopics;
  
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
  
  const availableKptTypes = useMemo(() => {
    const types = new Set<string>();
    analyzedData.forEach(row => {
      if (row.kptType) types.add(row.kptType);
    });
    return Array.from(types);
  }, [analyzedData]);
  
  const availablePrefectures = useMemo(() => {
    const prefectures = new Set<string>();
    analyzedData.forEach(row => {
      if (row.prefecture) prefectures.add(row.prefecture);
    });
    return Array.from(prefectures).sort();
  }, [analyzedData]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <SparklesIcon className="w-10 h-10 text-indigo-400" />
            KPT分析結果
          </h1>
          <p className="text-lg text-gray-400">
            エクスポート日時: {new Date(initialState.timestamp).toLocaleString('ja-JP')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            このページは静的にエクスポートされた分析結果です
          </p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 space-y-8">
          
          <div className="space-y-8">
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
                           setSelectedSubTopic(null);
                         }}
                         className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-700/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                         aria-expanded={selectedTopic === item.topic}
                       >
                         <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-2">
                           <ListBulletIcon className="w-5 h-5"/> {item.topic}
                         </h3>
                         <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${selectedTopic === item.topic ? 'rotate-180' : ''}`} />
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
                  {availableKptTypes.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">KPTフィルタ:</span>
                      <button
                        onClick={() => setSelectedKptType(null)}
                        className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ${
                          !selectedKptType 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        すべて
                      </button>
                      {availableKptTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedKptType(type)}
                          className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ${
                            selectedKptType === type
                              ? type === 'Keep' ? 'bg-green-600 text-white' : 
                                type === 'Problem' ? 'bg-red-600 text-white' : 
                                type === 'Try' ? 'bg-blue-600 text-white' :
                                'bg-indigo-600 text-white'
                              : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {availablePrefectures.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">都道府県:</span>
                      <button
                        onClick={() => setSelectedPrefecture(null)}
                        className={`px-3 py-1 text-xs rounded-md transition-all duration-200 ${
                          !selectedPrefecture 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        すべて
                      </button>
                      <select
                        value={selectedPrefecture || ''}
                        onChange={(e) => setSelectedPrefecture(e.target.value || null)}
                        className="px-3 py-1 text-xs bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
                        title={selectedPrefecture || '都道府県を選択'}
                      >
                        <option value="">都道府県</option>
                        {availablePrefectures.map(pref => {
                          const count = analyzedData.filter(d => d.prefecture === pref).length;
                          const displayText = pref.length > 4 ? pref.substring(0, 4) + '...' : pref;
                          return (
                            <option key={pref} value={pref} title={`${pref} (${count}件)`}>
                              {displayText} ({count})
                            </option>
                          );
                        })}
                      </select>
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

export default StaticApp;