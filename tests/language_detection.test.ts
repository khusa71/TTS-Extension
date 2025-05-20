// Test file for language_detection.ts
import { detectLanguage, getVoiceForLanguage } from '../src/language_detection';

describe('Language Detection Module', () => {
  test('detectLanguage identifies English text correctly', () => {
    const englishText = 'The quick brown fox jumps over the lazy dog.';
    expect(detectLanguage(englishText)).toBe('en-US');
  });

  test('detectLanguage identifies Spanish text correctly', () => {
    const spanishText = 'El rápido zorro marrón salta sobre el perro perezoso. ¿Cómo estás?';
    expect(detectLanguage(spanishText)).toBe('es-ES');
  });

  test('detectLanguage identifies German text correctly', () => {
    const germanText = 'Der schnelle braune Fuchs springt über den faulen Hund. Schöne Grüße!';
    expect(detectLanguage(germanText)).toBe('de-DE');
  });

  test('detectLanguage identifies Japanese text correctly', () => {
    const japaneseText = '速い茶色のキツネは怠け者の犬を飛び越えます。';
    expect(detectLanguage(japaneseText)).toBe('ja-JP');
  });

  test('detectLanguage falls back to English for ambiguous text', () => {
    const ambiguousText = '123456789';
    expect(detectLanguage(ambiguousText)).toBe('en-US');
  });

  test('getVoiceForLanguage returns appropriate voice for language', () => {
    expect(getVoiceForLanguage('en-US')).toBe('en-US-Neural2-A');
    expect(getVoiceForLanguage('ja-JP', 'WaveNet')).toBe('ja-JP-WaveNet-A');
    expect(getVoiceForLanguage('fr-FR', 'Standard')).toBe('fr-FR-Standard-A');
  });
});
