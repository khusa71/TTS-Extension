export interface PronunciationEntry {
    originalText: string;
    replacementText: string;
    isRegex: boolean;
    description?: string;
    language?: string;
}
export interface PronunciationDictionary {
    entries: PronunciationEntry[];
    isEnabled: boolean;
}
export declare const DEFAULT_DICTIONARY: PronunciationDictionary;
export declare function applyPronunciationDictionary(text: string, dictionary: PronunciationDictionary, languageCode?: string): string;
export declare function importDictionary(jsonString: string): PronunciationDictionary | null;
export declare function exportDictionary(dictionary: PronunciationDictionary): string;
export declare function saveDictionary(dictionary: PronunciationDictionary): void;
export declare function loadDictionary(callback: (dictionary: PronunciationDictionary) => void): void;
