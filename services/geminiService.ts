
import { GoogleGenAI, Type } from "@google/genai";

// Ensure the API key is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

export interface TopicWithSubtopics {
  topic: string;
  description: string;
  subTopics: string[];
}

export interface AnalyzedRow {
  id: string;
  originalText: string;
  topic: string;
  subTopic: string;
  kptType?: string;
  prefecture?: string;
}

/**
 * Extracts main topics and their sub-topics from a given block of text.
 */
export const extractTopicsAndSubtopics = async (text: string): Promise<TopicWithSubtopics[]> => {
  if (!text.trim()) {
    return [];
  }

  const prompt = `以下のテキストリストを分析し、主要なトピックを4つ抽出してください。各トピックに3〜5個の具体的なサブトピックを関連付けてください。
各トピックには簡潔なタイトルと1〜2文の説明を生成してください。
与えられたテキストリストの内容のみを分析対象とし、それ以外の情報は一切推測したり利用したりしないでください。
結果は、'topic'（トピック名）、'description'（説明）、'subTopics'（サブトピックの文字列配列）のキーを持つオブジェクトのJSON配列として返してください。

分析対象のテキスト:
---
${text.slice(0, 20000)} 
---
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "テキストから抽出された主要なトピックとサブトピックのリスト。",
          items: {
            type: Type.OBJECT,
            properties: {
              topic: {
                type: Type.STRING,
                description: "トピックの簡潔なタイトル。",
              },
              description: {
                type: Type.STRING,
                description: "トピックに関する1〜2文の説明。",
              },
              subTopics: {
                type: Type.ARRAY,
                description: "このトピックに関連するサブトピックのリスト。",
                items: {
                  type: Type.STRING,
                  description: "単一のサブトピック名。"
                }
              }
            },
            required: ["topic", "description", "subTopics"],
          },
        },
      },
    });

    const jsonString = response.text.trim();
    const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const topics = JSON.parse(cleanedJsonString);

    if (Array.isArray(topics) && topics.every(t => typeof t === 'object' && t.topic && t.description && Array.isArray(t.subTopics))) {
      // Add "その他" topic explicitly
      topics.push({
        topic: "その他",
        description: "上記のカテゴリに分類されないその他の内容やトピック。",
        subTopics: ["未分類", "その他全般", "特定不可", "分類困難", "例外的内容"]
      });
      return topics;
    } else {
      throw new Error("APIからのレスポンスが期待される形式（トピックオブジェクトの配列）ではありません。");
    }
  } catch (error) {
    console.error("Gemini API call for topic extraction failed:", error);
    throw new Error("トピック抽出のためのGemini APIとの通信に失敗しました。");
  }
};


export interface TextWithId {
  id: string;
  text: string;
}

/**
 * Assigns a topic and sub-topic to each text entry from a given list, using parallel batch processing.
 * @param textsWithIds An array of objects containing id and text to analyze.
 * @param topics The list of available topics and sub-topics.
 * @param onProgress A callback function to report progress percentage.
 * @returns A promise that resolves to an array of AnalyzedRow objects.
 */
export const assignTopicsToData = async (textsWithIds: TextWithId[], topics: TopicWithSubtopics[], onProgress: (progress: number) => void): Promise<AnalyzedRow[]> => {
  if (textsWithIds.length === 0 || topics.length === 0) {
    return [];
  }

  const BATCH_SIZE = 20;
  const textChunks: TextWithId[][] = [];
  for (let i = 0; i < textsWithIds.length; i += BATCH_SIZE) {
    textChunks.push(textsWithIds.slice(i, i + BATCH_SIZE));
  }

  const topicsJsonString = JSON.stringify(topics.map(t => ({ topic: t.topic, subTopics: t.subTopics })), null, 2);
  let completedRequests = 0;

  const assignmentPromises = textChunks.map(chunk => {
    const prompt = `以下のテキストリストの各項目に、指定されたトピックとサブトピックの中から最も適切なものを割り当ててください。

テキストがどのトピックにも明確に当てはまらない場合は、topicとsubTopicに「その他」と設定してください。
結果は、'id'（入力データのID）、'originalText'（元のテキスト）、'topic'（割り当てられたトピック名）、'subTopic'（割り当てられたサブトピック名）のキーを持つオブジェクトのJSON配列として返してください。入力されたすべてのテキストに対して、必ず1つのオブジェクトを生成してください。

利用可能なトピックとサブトピック:
---
${topicsJsonString}
---

分析対象のテキストリスト（IDとテキストのペア）:
---
${JSON.stringify(chunk)}
---
`;

    return (async (): Promise<AnalyzedRow[]> => {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              description: "各テキストにトピックとサブトピックを割り当てた結果のリスト。",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "入力データのID。" },
                  originalText: { type: Type.STRING, description: "元のテキスト文字列。" },
                  topic: { type: Type.STRING, description: "割り当てられたトピック名。" },
                  subTopic: { type: Type.STRING, description: "割り当てられたサブトピック名。" },
                },
                required: ["id", "originalText", "topic", "subTopic"],
              },
            },
          },
        });

        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const assignments = JSON.parse(cleanedJsonString);
        
        if (Array.isArray(assignments) && assignments.every(a => typeof a === 'object' && 'id' in a && 'originalText' in a && 'topic' in a && 'subTopic' in a)) {
          return assignments;
        } else {
          console.warn("API returned an unexpected format for a batch. Mapping to error state.", assignments);
          return chunk.map(item => ({ id: item.id, originalText: item.text, topic: '割り当てエラー', subTopic: 'データ形式不正' }));
        }

      } catch (error) {
        console.error("A batch failed during topic assignment:", error);
        return chunk.map(item => ({ id: item.id, originalText: item.text, topic: '割り当てエラー', subTopic: 'API通信失敗' }));
      } finally {
        completedRequests++;
        onProgress(Math.round((completedRequests / textChunks.length) * 100));
      }
    })();
  });

  try {
    const resultsFromAllBatches = await Promise.all(assignmentPromises);
    const allAssignments: AnalyzedRow[] = resultsFromAllBatches.flat();
    
    const assignmentsMap = new Map(allAssignments.map(a => [a.id, a]));
    return textsWithIds.map(item => {
        const assignment = assignmentsMap.get(item.id);
        if (assignment) {
            return assignment;
        }
        return {
            id: item.id,
            originalText: item.text,
            topic: '未割り当て',
            subTopic: '未割り当て'
        };
    });
  } catch (error) {
    console.error("Global error during parallel topic assignment:", error);
    throw new Error("トピックの並列割り当て処理中に全体的なエラーが発生しました。");
  }
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Asks a question about the filtered data using Gemini AI.
 * @param question The user's question about the data.
 * @param filteredData The filtered data to analyze.
 * @param conversationHistory Previous messages for context.
 * @returns A promise that resolves to the AI's response.
 */
export const askQuestionAboutData = async (
  question: string, 
  filteredData: AnalyzedRow[], 
  conversationHistory: ChatMessage[] = []
): Promise<string> => {
  if (!question.trim() || filteredData.length === 0) {
    return "質問またはデータが空です。有効な質問とフィルタされたデータを提供してください。";
  }

  // Prepare data summary for context
  const dataSummary = filteredData.slice(0, 100).map(row => ({
    id: row.id,
    text: row.originalText.slice(0, 200), // Limit text length
    topic: row.topic,
    subTopic: row.subTopic,
    kptType: row.kptType,
    prefecture: row.prefecture
  }));

  // Build conversation context
  const conversationContext = conversationHistory.slice(-5).map(msg => 
    `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`
  ).join('\n');

  const prompt = `以下のフィルタされたデータについて質問に答えてください。データは最大100件まで含まれています。

${conversationContext ? `会話履歴:\n${conversationContext}\n` : ''}

現在の質問: ${question}

分析対象のデータ（JSON形式）:
---
${JSON.stringify(dataSummary, null, 2)}
---

データの概要:
- 総件数: ${filteredData.length}件
- 表示データ: ${Math.min(100, filteredData.length)}件

質問に対して、データの内容に基づいて具体的かつ有用な回答を提供してください。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API chat call failed:", error);
    throw new Error("チャット機能でのGemini APIとの通信に失敗しました。");
  }
};
