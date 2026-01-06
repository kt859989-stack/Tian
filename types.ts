
export type TabType = 'fortune' | 'compatibility';

export interface UserInfo {
  name: string;
  birthDate: string;
  birthTime?: string; // HH:mm
  birthPlace: string;
  gender: string;
}

export interface FortuneResult {
  bazi: string;
  summary: string;
  score: number;
  todo: string[];
  notodo: string[];
  insight: string;
  imageUrl?: string;
  imagePrompt: string;
}

export interface CompatibilityResult {
  score: number;
  matchAnalysis: string;
  dynamic: string;
  todo: string[];
  notodo: string[];
  imageUrl?: string;
  imagePrompt: string;
}
