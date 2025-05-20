// Pronunciation dictionary module
/// <reference types="chrome" />

export interface PronunciationEntry {
  originalText: string;
  replacementText: string;
  isRegex: boolean;
  description?: string;
  language?: string; // ISO language code to scope the replacement
}

export interface PronunciationDictionary {
  entries: PronunciationEntry[];
  isEnabled: boolean;
}

export const DEFAULT_DICTIONARY: PronunciationDictionary = {
  entries: [
    {
      originalText: 'TTS',
      replacementText: 'Text to Speech',
      isRegex: false,
      description: 'Expand TTS acronym'
    },
    {
      originalText: 'API',
      replacementText: 'A P I',
      isRegex: false,
      description: 'Spell out API'
    }
  ],
  isEnabled: true
};

// Apply pronunciation dictionary to text
export function applyPronunciationDictionary(
  text: string, 
  dictionary: PronunciationDictionary,
  languageCode?: string
): string {
  if (!dictionary.isEnabled) return text;
  
  let processedText = text;
  
  dictionary.entries.forEach(entry => {
    // Skip if a language is specified for this entry and it doesn't match
    if (entry.language && languageCode && entry.language !== languageCode) {
      return;
    }
    
    if (entry.isRegex) {
      // Convert string to RegExp
      try {
        const regex = new RegExp(entry.originalText, 'g');
        processedText = processedText.replace(regex, entry.replacementText);
      } catch (e) {
        console.error(`Invalid regex in pronunciation dictionary: ${entry.originalText}`);
      }
    } else {
      // Simple string replacement
      const regex = new RegExp(`\\b${escapeRegExp(entry.originalText)}\\b`, 'g');
      processedText = processedText.replace(regex, entry.replacementText);
    }
  });
  
  return processedText;
}

// Helper to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Import dictionary from JSON
export function importDictionary(jsonString: string): PronunciationDictionary | null {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate structure
    if (!Array.isArray(parsed.entries)) {
      throw new Error('Invalid dictionary format: entries must be an array');
    }
    
    // Validate each entry
    parsed.entries.forEach((entry: any) => {
      if (typeof entry.originalText !== 'string' || typeof entry.replacementText !== 'string') {
        throw new Error('Dictionary entries must have originalText and replacementText as strings');
      }
      
      if (typeof entry.isRegex !== 'boolean') {
        throw new Error('Dictionary entries must have isRegex as boolean');
      }
    });
    
    return {
      entries: parsed.entries,
      isEnabled: typeof parsed.isEnabled === 'boolean' ? parsed.isEnabled : true
    };
  } catch (e) {
    console.error('Error importing dictionary:', e);
    return null;
  }
}

// Export dictionary to JSON
export function exportDictionary(dictionary: PronunciationDictionary): string {
  return JSON.stringify(dictionary, null, 2);
}

// Save dictionary
export function saveDictionary(dictionary: PronunciationDictionary): void {
  chrome.storage.local.set({ pronunciationDictionary: dictionary });
}

// Load dictionary
export function loadDictionary(callback: (dictionary: PronunciationDictionary) => void): void {
  chrome.storage.local.get(['pronunciationDictionary'], (result: {pronunciationDictionary?: PronunciationDictionary}) => {
    const dictionary = result.pronunciationDictionary || DEFAULT_DICTIONARY;
    callback(dictionary);
  });
}
