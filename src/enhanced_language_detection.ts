// Enhanced language detection with n-gram analysis and better voice selection
// This module provides more accurate language detection and automatic voice selection

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

// Common language patterns, unique characters, and distinctive n-grams
const languagePatterns: Record<string, {
  commonWords: RegExp;
  uniqueChars?: RegExp;
  ngrams?: string[];
}> = {
  'en-US': {
    commonWords: /\b(?:the|and|is|in|to|of|that|you|for|have|with|this|are|on|not|but|from|or|by|an|they|we|as)\b/gi,
    ngrams: ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar']
  },
  'en-GB': {
    commonWords: /\b(?:the|and|is|in|to|of|that|you|for|have|with|this|are|on|not|but|from|or|by|an|they|we|as)\b/gi,
    ngrams: ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd', 'ti', 'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar']
  },
  'es-ES': {
    commonWords: /\b(?:el|la|en|de|que|y|a|los|se|un|por|con|una|para|del|las|es|al|su|no|como|más)\b/gi,
    uniqueChars: /[áéíóúüñ¿¡]/g,
    ngrams: ['de', 'en', 'er', 'es', 'la', 'el', 'ar', 'que', 'os', 'ent', 'ado', 'con', 'ion', 'est', 'ant']
  },
  'fr-FR': {
    commonWords: /\b(?:le|la|les|des|en|et|est|que|un|une|du|dans|pour|par|sur|qui|ce|ne|pas|au|plus)\b/gi,
    uniqueChars: /[àâçéèêëîïôùûü]/g,
    ngrams: ['es', 'le', 'de', 'en', 're', 'on', 'nt', 'ou', 'an', 'ai', 'qu', 'ur', 'it', 'et', 'ment']
  },
  'de-DE': {
    commonWords: /\b(?:der|die|das|in|und|zu|den|von|mit|auf|für|im|dem|nicht|ein|eine|ist|auch|sich)\b/gi,
    uniqueChars: /[äöüß]/g,
    ngrams: ['en', 'er', 'ch', 'te', 'de', 'in', 'ge', 'ie', 'sch', 'und', 'ein', 'ich', 'den', 'ung', 'der']
  },
  'it-IT': {
    commonWords: /\b(?:il|la|e|di|che|in|un|per|è|non|sono|una|con|del|si|come|da|questo|ma|se|io)\b/gi,
    uniqueChars: /[àèéìòù]/g,
    ngrams: ['di', 'la', 'er', 'to', 'in', 'che', 'le', 'del', 'per', 'on', 'no', 'co', 'ta', 'un', 'ri']
  },
  'pt-BR': {
    commonWords: /\b(?:de|a|o|que|e|do|da|em|um|para|com|não|uma|os|no|se|na|por|mais|as|dos)\b/gi,
    uniqueChars: /[áàâãçéêíóôõúü]/g,
    ngrams: ['de', 'ra', 'es', 'os', 'ar', 'en', 'do', 'as', 'da', 'em', 'que', 'ent', 'nte', 'ndo', 'ado']
  },
  'ja-JP': {
    commonWords: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g
  },
  'zh-CN': {
    commonWords: /[\u4E00-\u9FFF]/g
  },
  'ko-KR': {
    commonWords: /[\uAC00-\uD7AF\u1100-\u11FF]/g
  },
  'ru-RU': {
    commonWords: /[\u0400-\u04FF]/g,
    ngrams: ['то', 'ет', 'ен', 'ов', 'но', 'на', 'ст', 'ра', 'ни', 'ко', 'го']
  },
  'ar-XA': {
    commonWords: /[\u0600-\u06FF]/g
  },
  'hi-IN': {
    commonWords: /[\u0900-\u097F]/g
  },
  'nl-NL': {
    commonWords: /\b(?:de|het|een|in|en|van|te|is|dat|op|zijn|met|voor|niet|aan|er|ook|als|maar)\b/gi,
    uniqueChars: /[àáäçèéêëìíïòóöùúü]/g,
    ngrams: ['en', 'de', 'er', 'an', 'ee', 'in', 'ge', 'et', 'te', 'van', 'aan', 'oor', 'ijk', 'ing']
  }
};

// Extract n-grams from text (character sequences like 'th', 'er', etc.)
function extractNgrams(text: string, n: number = 2): Record<string, number> {
  const ngrams: Record<string, number> = {};
  
  // Remove non-alphanumeric characters and normalize
  const normalizedText = text.toLowerCase().replace(/[^a-z\u00C0-\u00FF\u0400-\u04FF\u0900-\u097F\u0600-\u06FF\u0370-\u03FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF]/gi, ' ');
  
  for (let i = 0; i <= normalizedText.length - n; i++) {
    const ngram = normalizedText.slice(i, i + n);
    // Skip n-grams that contain spaces
    if (ngram.includes(' ')) continue;
    // Count occurrences
    ngrams[ngram] = (ngrams[ngram] || 0) + 1;
  }
  
  return ngrams;
}

// Enhanced language detection with n-gram analysis
export function detectLanguage(text: string): { languageCode: string; confidence: number } {
  if (!text || text.trim().length === 0) {
    return { languageCode: 'en-US', confidence: 0 };
  }
  
  const scores: LanguageScore[] = [];
  const textNgrams = extractNgrams(text, 2);
  
  // Score each language
  for (const [language, patterns] of Object.entries(languagePatterns)) {
    let wordScore = 0;
    let charScore = 0;
    let ngramScore = 0;
    
    // Check common words
    const wordMatches = text.match(patterns.commonWords);
    if (wordMatches) {
      wordScore = wordMatches.length / (text.length / 100);
    }
    
    // Check unique characters
    if (patterns.uniqueChars) {
      const charMatches = text.match(patterns.uniqueChars);
      if (charMatches) {
        charScore = charMatches.length * 2; // Weight character matches higher
      }
    }
    
    // Check n-grams
    if (patterns.ngrams) {
      for (const ngram of patterns.ngrams) {
        const count = textNgrams[ngram] || 0;
        ngramScore += count;
      }
      ngramScore = ngramScore / (text.length / 100);
    }
    
    // Calculate total score with different weights
    const totalScore = wordScore * 0.4 + charScore * 0.3 + ngramScore * 0.3;
    
    // Confidence is relative to the best possible score
    const maxPossibleScore = 10; // This is a theoretical maximum
    const confidence = Math.min(totalScore / maxPossibleScore, 1);
    
    scores.push({ language, score: totalScore, confidence });
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  // Debug information
  console.log('Language detection scores:', scores.slice(0, 3));
  
  // If top score is significantly higher, use it
  if (scores.length > 0 && scores[0].score > 0) {
    // If second highest is less than 70% of the highest score, we're confident
    if (scores.length === 1 || scores[1].score < scores[0].score * 0.7) {
      return { 
        languageCode: scores[0].language, 
        confidence: scores[0].confidence 
      };
    }
  }
  
  // Default fallback
  return { languageCode: 'en-US', confidence: 0.2 };
}

// Map Google voice languages to their language codes and full names
export const languageCodeMapping: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'en-AU': 'English (Australia)',
  'en-IN': 'English (India)',
  'es-ES': 'Spanish (Spain)',
  'es-US': 'Spanish (US)',
  'fr-FR': 'French',
  'fr-CA': 'French (Canada)',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Chinese (Mandarin)',
  'zh-TW': 'Chinese (Taiwan)',
  'ru-RU': 'Russian',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'hi-IN': 'Hindi',
  'ar-XA': 'Arabic',
  'nl-NL': 'Dutch',
  'pl-PL': 'Polish',
  'id-ID': 'Indonesian',
  'sv-SE': 'Swedish',
  'tr-TR': 'Turkish',
  'da-DK': 'Danish',
  'fi-FI': 'Finnish',
  'no-NO': 'Norwegian',
  'cs-CZ': 'Czech',
  'el-GR': 'Greek',
  'hu-HU': 'Hungarian',
  'ro-RO': 'Romanian',
  'sk-SK': 'Slovak',
  'uk-UA': 'Ukrainian',
  'vi-VN': 'Vietnamese',
  'th-TH': 'Thai',
  'fil-PH': 'Filipino',
  'cmn-CN': 'Mandarin Chinese',
  'yue-HK': 'Cantonese'
};

// Cache of available voices to avoid repeated API calls
let availableVoicesCache: Voice[] = [];

// Set available voices (should be called after fetching from API)
export function setAvailableVoices(voices: Voice[]): void {
  availableVoicesCache = voices;
  console.log(`Cached ${voices.length} available voices for language detection`);
}

// Get available voices
export function getAvailableVoices(): Voice[] {
  return availableVoicesCache;
}

// Find best voice for a given language code
export function findBestVoiceForLanguage(
  languageCode: string, 
  preferences: { 
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL', 
    voiceType?: 'Neural2' | 'WaveNet' | 'Studio' | 'Standard'
  } = {}
): string | null {
  if (!availableVoicesCache.length) {
    console.warn('No voices available in cache. Cannot find optimal voice.');
    return null;
  }
  
  // Type priority (best to worst)
  const typePriority = ['Neural2', 'Studio', 'WaveNet', 'Standard'];
  
  // Filter voices by language code
  let matchingVoices = availableVoicesCache.filter(v => v.languageCode === languageCode);
  
  // If no exact match, try to find voices with the same language base (e.g., 'en' for 'en-US')
  if (matchingVoices.length === 0) {
    const languageBase = languageCode.split('-')[0];
    matchingVoices = availableVoicesCache.filter(v => v.languageCode.startsWith(languageBase + '-'));
  }
  
  // Still no matches, return null
  if (matchingVoices.length === 0) {
    return null;
  }
  
  // Filter by gender if specified
  if (preferences.gender) {
    const genderMatches = matchingVoices.filter(v => v.gender === preferences.gender);
    if (genderMatches.length > 0) {
      matchingVoices = genderMatches;
    }
  }
  
  // Filter by voice type if specified
  if (preferences.voiceType) {
    const typeMatches = matchingVoices.filter(v => v.type === preferences.voiceType);
    if (typeMatches.length > 0) {
      matchingVoices = typeMatches;
    }
  }
  
  // Sort by voice type quality
  matchingVoices.sort((a, b) => {
    const aTypeIndex = typePriority.indexOf(a.type as any);
    const bTypeIndex = typePriority.indexOf(b.type as any);
    // If type is not in our priority list, rank it last
    const aIndex = aTypeIndex === -1 ? 999 : aTypeIndex;
    const bIndex = bTypeIndex === -1 ? 999 : bTypeIndex;
    return aIndex - bIndex;
  });
  
  // Return the best voice
  return matchingVoices.length > 0 ? matchingVoices[0].name : null;
}

// Auto-detect language and find best voice
export async function autoSelectVoice(
  text: string,
  preferences: { 
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL', 
    voiceType?: 'Neural2' | 'WaveNet' | 'Studio' | 'Standard'
  } = {}
): Promise<{
  detectedLanguage: string;
  confidence: number;
  voice: string | null;
  fallbackUsed: boolean;
}> {
  // Detect language
  const { languageCode, confidence } = detectLanguage(text);
  
  // Find best voice
  const bestVoice = findBestVoiceForLanguage(languageCode, preferences);
  
  // If no voice found, try fallback to English
  let fallbackUsed = false;
  let selectedVoice = bestVoice;
  
  if (!bestVoice) {
    console.warn(`No voice found for ${languageCode}, falling back to en-US`);
    selectedVoice = findBestVoiceForLanguage('en-US', preferences);
    fallbackUsed = true;
  }
  
  return {
    detectedLanguage: languageCode,
    confidence,
    voice: selectedVoice,
    fallbackUsed
  };
}
