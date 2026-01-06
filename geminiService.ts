
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserInfo, FortuneResult, CompatibilityResult } from "./types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const speakProphecy = async (text: string) => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `请用一位慈祥、专业的周易老大师语气读出这段开示：${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const generateDestinyImage = async (prompt: string) => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Traditional Chinese ink wash painting, Zen style, spiritual and ethereal: ${prompt}` }]
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    return part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : null;
  } catch (e) {
    return null;
  }
};

const formatUserInfo = (u: UserInfo) => {
  return `姓名：${u.name}，性别：${u.gender}，出生日期：${u.birthDate}，出生时分：${u.birthTime || '未知'}，出生地点：${u.birthPlace}`;
};

export const getDailyFortune = async (info: UserInfo, date: string): Promise<FortuneResult> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `请根据以下信息进行今日（${date}）命理推演：${formatUserInfo(info)}。`,
    config: {
      systemInstruction: "你是一位精通子平八字与梅花易数的AI命理大师。请根据用户的出生地、时分（若有）推算当日运势。请以JSON格式返回。",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["bazi", "summary", "score", "todo", "notodo", "insight", "imagePrompt"],
        properties: {
          bazi: { type: Type.STRING, description: "生辰八字排盘" },
          summary: { type: Type.STRING, description: "今日气运总评（4字）" },
          score: { type: Type.INTEGER, description: "运势分数 0-100" },
          todo: { type: Type.ARRAY, items: { type: Type.STRING }, description: "今日宜" },
          notodo: { type: Type.ARRAY, items: { type: Type.STRING }, description: "今日忌" },
          insight: { type: Type.STRING, description: "大师开示" },
          imagePrompt: { type: Type.STRING, description: "意象描述，用于绘图" }
        }
      }
    }
  });
  const data = JSON.parse(response.text || '{}');
  const imageUrl = await generateDestinyImage(data.imagePrompt);
  return { ...data, imageUrl };
};

export const getCompatibility = async (u1: UserInfo, u2: UserInfo): Promise<CompatibilityResult> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `请测算缘主 A：${formatUserInfo(u1)} 与 缘主 B：${formatUserInfo(u2)} 的缘分合婚。`,
    config: {
      systemInstruction: "你是一位专业的合婚大师。基于两人的生辰八字、地理方位进行深度匹配分析。请以JSON格式返回。",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["score", "matchAnalysis", "dynamic", "todo", "notodo", "imagePrompt"],
        properties: {
          score: { type: Type.INTEGER, description: "匹配度 0-100" },
          matchAnalysis: { type: Type.STRING, description: "缘分详批" },
          dynamic: { type: Type.STRING, description: "关系走向（4字）" },
          todo: { type: Type.ARRAY, items: { type: Type.STRING } },
          notodo: { type: Type.ARRAY, items: { type: Type.STRING } },
          imagePrompt: { type: Type.STRING }
        }
      }
    }
  });
  const data = JSON.parse(response.text || '{}');
  const imageUrl = await generateDestinyImage(data.imagePrompt);
  return { ...data, imageUrl };
};

// PCM 处理
export function encodePCM(data: Float32Array): string {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decodePCM(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function convertPCMToBuffer(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
  return buffer;
}
