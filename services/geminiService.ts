
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserInfo, FortuneResult, CompatibilityResult } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.message?.includes('finish what you were doing')) {
      throw new Error("天机阁今日访客过多（API 额度受限），请稍候片刻再来祈请。");
    }
    if (retries <= 0) throw error;
    await new Promise(res => setTimeout(res, 2000));
    return retryWithBackoff(fn, retries - 1);
  }
};

const generateSeed = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const speakProphecy = async (text: string) => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `请用一位老练、慈祥、语速稍慢的命理大师语气，富有感情地朗读这段批注：${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("语音合成失败");
    return base64Audio;
  });
};

export const generateDestinyImage = async (promptText: string) => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A high-quality traditional Chinese ink painting, minimalist, elegant, representing the concept of: ${promptText}. Golden light, silk texture, zen atmosphere.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });
    for (const part of response.candidates?.[0].content.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  });
};

export const getDailyFortune = async (info: UserInfo, targetDate: string): Promise<FortuneResult & { imageUrl?: string }> => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const seed = generateSeed(`${info.name}-${info.birthDate}-${targetDate}`);

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `你是一位精通周易与八字的命理大师。分析${info.name}(${info.gender})在${targetDate}的运势。`,
      config: {
        systemInstruction: `必须严格遵守以下规则：
        1. "todo"(宜)和"notodo"(忌)必须是互斥的，不能在宜里出现忌的内容。
        2. "todo"和"notodo"各返回3个短语，每个短语严格限制在4-8个汉字之间，不准超长。
        3. "score"必须是1-100之间的整数。
        4. "insight"是详细的文字解析，要求古风且富有哲理，字数300字左右。`,
        responseMimeType: "application/json",
        seed: seed,
        responseSchema: {
          type: Type.OBJECT,
          required: ["bazi", "summary", "score", "todo", "notodo", "insight", "imagePrompt"],
          properties: {
            bazi: { type: Type.STRING, description: "干支八字" },
            summary: { type: Type.STRING, description: "四字断语" },
            score: { type: Type.INTEGER },
            fiveElements: { type: Type.STRING },
            luckyColor: { type: Type.STRING },
            luckyDirection: { type: Type.STRING },
            todo: { type: Type.ARRAY, items: { type: Type.STRING } },
            notodo: { type: Type.ARRAY, items: { type: Type.STRING } },
            insight: { type: Type.STRING },
            imagePrompt: { type: Type.STRING }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const imageUrl = await generateDestinyImage(data.imagePrompt || "Destiny landscape").catch(() => null);
    return { ...data, imageUrl };
  });
};

export const getCompatibility = async (u1: UserInfo, u2: UserInfo): Promise<CompatibilityResult & { imageUrl?: string }> => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const seed = generateSeed(`comp-${u1.name}-${u2.name}`);

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `分析${u1.name}与${u2.name}的合婚缘分。`,
      config: {
        systemInstruction: `必须严格遵守：
        1. "todo"和"notodo"为两人共同生活的建议，各3条，每条4-8字，严禁重复或逻辑冲突。
        2. "score"为1-100的整数。
        3. "matchAnalysis"提供300字左右的深度文字解析。`,
        responseMimeType: "application/json",
        seed: seed,
        responseSchema: {
          type: Type.OBJECT,
          required: ["score", "matchAnalysis", "todo", "notodo", "dynamic"],
          properties: {
            score: { type: Type.INTEGER },
            baziA: { type: Type.STRING },
            baziB: { type: Type.STRING },
            matchAnalysis: { type: Type.STRING },
            fiveElementMatch: { type: Type.STRING },
            advice: { type: Type.STRING },
            dynamic: { type: Type.STRING },
            todo: { type: Type.ARRAY, items: { type: Type.STRING } },
            notodo: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    const imageUrl = await generateDestinyImage(data.imagePrompt || "Union of two souls").catch(() => null);
    return { ...data, imageUrl };
  });
};
