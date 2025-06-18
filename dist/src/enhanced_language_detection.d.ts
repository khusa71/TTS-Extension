export interface LanguageScore {
    language: string;
    score: number;
    confidence: number;
}
export interface Voice {
    name: string;
    languageCode: string;
    gender: string;
    type: string;
}
export declare function detectLanguage(text: string): {
    languageCode: string;
    confidence: number;
};
export declare const languageCodeMapping: Record<string, string>;
export declare function setAvailableVoices(voices: Voice[]): void;
export declare function getAvailableVoices(): Voice[];
export declare function findBestVoiceForLanguage(languageCode: string, preferences?: {
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    voiceType?: 'Neural2' | 'WaveNet' | 'Studio' | 'Standard';
}): string | null;
export declare function autoSelectVoice(text: string, preferences?: {
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
    voiceType?: 'Neural2' | 'WaveNet' | 'Studio' | 'Standard';
}): Promise<{
    detectedLanguage: string;
    confidence: number;
    voice: string | null;
    fallbackUsed: boolean;
}>;
