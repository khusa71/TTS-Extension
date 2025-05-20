export declare function detectLanguage(text: string): string;
export declare const languageCodeMapping: Record<string, string>;
export declare function getVoiceForLanguage(languageCode: string, voiceType?: 'Neural2' | 'WaveNet' | 'Standard'): string;
