
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserInfo, FortuneResult, CompatibilityResult } from "./types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (error?.message?.includes('429')) {
      throw new Error("大海贼时代访客过多（API频率限制），请稍候再拨！");
    }
    if (retries <= 0) throw error;
    await new Promise(res => setTimeout(res, 2000));
    return retryWithBackoff(fn, retries - 1);
  }
};

export const speakProphecy = async (text: string) => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `请用一位像《海贼王》雷利那样豪迈智慧的老海贼语气，朗读这段话：${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  });
};

export const generateWantedImage = async (promptText: string) => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `One Piece anime wanted poster style, high quality illustration, hand-drawn look, vibrant colors, bounty poster aesthetic, representing: ${promptText}. Epic lighting.` }]
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0].content.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : null;
  });
};

export const getDailyFortune = async (info: UserInfo, targetDate: string): Promise<FortuneResult & { imageUrl?: string }> => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `分析海贼角色'${info.name}'在${targetDate}的航海运势。`,
      config: {
        systemInstruction: `
        1. 必须使用海贼王(One Piece)热血动漫风格。
        2. todo(宜)和notodo(忌)的内容必须逻辑互斥（宜的内容绝对不能出现在忌里）。
        3. 宜/忌各3项，每项严格限制在4-8个汉字。
        4. score必须是1-100之间的纯整数，严禁输出分数或百分比。
        5. insight是详批，字数约300，像雷利在酒馆里对新人海贼的告诫。`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["bazi", "summary", "score", "todo", "notodo", "insight", "imagePrompt"],
          properties: {
            bazi: { type: Type.STRING },
            summary: { type: Type.STRING },
            score: { type: Type.INTEGER },
            todo: { type: Type.ARRAY, items: { type: Type.STRING } },
            notodo: { type: Type.ARRAY, items: { type: Type.STRING } },
            insight: { type: Type.STRING },
            imagePrompt: { type: Type.STRING }
          }
        }
      }
    });
    const data = JSON.parse(response.text || '{}');
    const imageUrl = await generateWantedImage(data.imagePrompt || "Grand Line Adventure").catch(() => null);
    return { ...data, imageUrl };
  });
};

export const getCompatibility = async (u1: UserInfo, u2: UserInfo): Promise<CompatibilityResult & { imageUrl?: string }> => {
  return retryWithBackoff(async () => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `分析海贼伙伴'${u1.name}'与'${u2.name}'的灵魂羁绊。`,
      config: {
        systemInstruction: `风格：海贼王伙伴羁绊。score为1-100整数。宜/忌各3项，每项4-8字。`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["score", "matchAnalysis", "todo", "notodo", "dynamic"],
          properties: {
            score: { type: Type.INTEGER },
            baziA: { type: Type.STRING },
            baziB: { type: Type.STRING },
            matchAnalysis: { type: Type.STRING },
            dynamic: { type: Type.STRING },
            todo: { type: Type.ARRAY, items: { type: Type.STRING } },
            notodo: { type: Type.ARRAY, items: { type: Type.STRING } },
            imagePrompt: { type: Type.STRING }
          }
        }
      }
    });
    const data = JSON.parse(response.text || '{}');
    const imageUrl = await generateWantedImage(data.imagePrompt || "Pirate Alliance").catch(() => null);
    return { ...data, imageUrl };
  });
};
