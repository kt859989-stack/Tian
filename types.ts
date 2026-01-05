
export type TabType = 'fortune' | 'compatibility';

export interface UserInfo {
  name: string;
  birthDate: string;
  birthTime?: string;
  birthPlace: string;
  gender: string;
}

export interface FortuneResult {
  bazi: string;
  summary: string;
  score: number; // 气运评分，0-100
  luckyColor: string;
  luckyDirection: string;
  todo: string[]; // 宜做事项
  notodo: string[]; // 忌做事项
  insight: string; // 深度解析
  fiveElements: string;
  imagePrompt: string;
}

export interface CompatibilityResult {
  score: number;
  baziA: string;
  baziB: string;
  matchAnalysis: string;
  fiveElementMatch: string;
  advice: string;
  dynamic: string;
  todo: string[];
  notodo: string[];
  imagePrompt: string;
}

// Added Meme interface to fix the import error in components/MemeDisplay.tsx
export interface Meme {
  url: string;
  caption: string;
}
