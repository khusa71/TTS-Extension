// Language detection module

interface LanguageScore {
  language: string;
  score: number;
}

// Common language patterns and unique characters
const languagePatterns: Record<string, RegExp[]> = {
  'en-US': [/\b(?:the|and|is|in|to|of|that|you|for)\b/gi],
  'es-ES': [/\b(?:el|la|en|de|que|y|a|los|se|un)\b/gi, /[áéíóúüñ¿¡]/g],
  'fr-FR': [/\b(?:le|la|les|des|en|et|est|que|un|une)\b/gi, /[àâçéèêëîïôùûü]/g],
  'de-DE': [/\b(?:der|die|das|in|und|zu|von|für|ist)\b/gi, /[äöüß]/g],
  'it-IT': [/\b(?:il|la|e|di|che|in|un|per|è)\b/gi, /[àèéìòù]/g],
  'ja-JP': [/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g],
  'zh-CN': [/[\u4E00-\u9FFF]/g],
  'ko-KR': [/[\uAC00-\uD7AF\u1100-\u11FF]/g],
  'ru-RU': [/[\u0400-\u04FF]/g],
  'ar-XA': [/[\u0600-\u06FF]/g],
  'hi-IN': [/[\u0900-\u097F]/g]
};

// Basic language detection based on character patterns
export function detectLanguage(text: string): string {
  const scores: LanguageScore[] = [];
  
  // Score each language
  for (const [language, patterns] of Object.entries(languagePatterns)) {
    let score = 0;
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
      }
    });
    
    // Normalize the score based on text length
    score = score / (text.length / 100);
    scores.push({ language, score });
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  // If top score is significantly higher, use it
  if (scores.length > 0 && scores[0].score > 0) {
    // If second highest is less than 60% of the highest score, we're confident
    if (scores.length === 1 || scores[1].score < scores[0].score * 0.6) {
      return scores[0].language;
    }
  }
  
  // Default fallback
  return 'en-US';
}

// Map Google voice languages to their language codes
export const languageCodeMapping: Record<string, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Chinese',
  'ru-RU': 'Russian',
  'pt-BR': 'Portuguese',
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
  'th-TH': 'Thai'
};

// Get the most suitable voice for a detected language
export function getVoiceForLanguage(languageCode: string, voiceType: 'Neural2' | 'WaveNet' | 'Standard' = 'Neural2'): string {
  // This would be populated with actual available voices from the API
  // For now, return a template format that matches Google's naming
  const name = `${languageCode}-${voiceType}-A`;
  return name;
}
