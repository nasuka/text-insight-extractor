
import { GoogleGenAI, Type } from "@google/genai";

// Ensure the API key is available in the environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Extracts keywords from a given block of text using the Gemini API.
 * @param text The text data from which to extract keywords.
 * @returns A promise that resolves to an array of string keywords.
 */
export const extractKeywordsFromText = async (text: string): Promise<string[]> => {
  if (!text.trim()) {
    return [];
  }

  const prompt = `以下のテキストデータから、内容を特徴づけるキーワードやキーフレーズを15個抽出してください。一般的な助詞や接続詞などのストップワードは除外してください。結果は、キーワードの文字列を含むJSON配列として返してください。

テキストデータ:
---
${text.slice(0, 15000)}
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
          description: "テキストから抽出された特徴的なキーワードやキーフレーズのリスト。",
          items: {
            type: Type.STRING,
            description: "単一のキーワードまたはキーフレーズ。",
          },
        },
      },
    });

    const jsonString = response.text.trim();
    const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const keywords = JSON.parse(cleanedJsonString);

    if (Array.isArray(keywords) && keywords.every(k => typeof k === 'string')) {
        return keywords;
    } else {
        throw new Error("APIからのレスポンスが期待される形式（文字列の配列）ではありません。");
    }

  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Gemini APIとの通信に失敗しました。プロンプトまたはAPIキーを確認してください。");
  }
};

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

  const prompt = `以下のテキストリストを分析し、主要なトピックを5つ抽出してください。各トピックに3〜5個の具体的なサブトピックを関連付けてください。
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
