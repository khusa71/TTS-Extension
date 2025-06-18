/**
 * Cache manager for TTS audio content to reduce API calls.
 * This improves performance and reduces costs by storing frequently used audio.
 */
interface CachedAudio {
    audioContent: string;
    timestamp: number;
    voice: string;
    speed: number;
    textHash: string;
}
interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    lastCleanup: number;
}
declare class AudioCache {
    private cache;
    private maxCacheSize;
    private maxCacheAge;
    private stats;
    /**
     * Initialize the cache with optional settings
     */
    constructor(options?: {
        maxSize?: number;
        maxAge?: number;
    });
    /**
     * Generate a cache key from text, voice and speed
     */
    private generateKey;
    /**
     * Simple hash function for text
     */
    private hashText;
    /**
     * Get audio from cache if available
     * @returns The cached audio content or null if not found
     */
    get(text: string, voice: string, speed: number): string | null;
    /**
     * Add audio to cache
     */
    set(text: string, voice: string, speed: number, audioContent: string): void;
    /**
     * Clean up old and excess cache items
     */
    private cleanup;
    /**
     * Save cache to chrome.storage.local
     */
    private saveToStorage;
    /**
     * Load cache from chrome.storage.local
     */
    private loadFromStorage;
    /**
     * Clear all cached items
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
}
export declare const audioCache: AudioCache;
export type { CachedAudio, CacheStats };
