// audio_cache.ts - A caching system for TTS audio content
/**
 * Cache manager for TTS audio content to reduce API calls.
 * This improves performance and reduces costs by storing frequently used audio.
 */

interface CachedAudio {
    audioContent: string;  // Base64 encoded audio
    timestamp: number;     // Time when cached
    voice: string;         // Voice ID
    speed: number;         // Playback speed
    textHash: string;      // Hash of the original text
}

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    lastCleanup: number;
}

class AudioCache {
    private cache = new Map<string, CachedAudio>();
    private maxCacheSize: number = 100; // Maximum number of cached items
    private maxCacheAge: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    private stats: CacheStats = { hits: 0, misses: 0, size: 0, lastCleanup: Date.now() };
    
    /**
     * Initialize the cache with optional settings
     */
    constructor(options?: { maxSize?: number, maxAge?: number }) {
        if (options?.maxSize) this.maxCacheSize = options.maxSize;
        if (options?.maxAge) this.maxCacheAge = options.maxAge;
        
        // Load cached items from storage
        this.loadFromStorage();
        
        console.log(`Audio cache initialized with max size: ${this.maxCacheSize}, max age: ${this.maxCacheAge / (60 * 60 * 1000)} hours`);
    }
    
    /**
     * Generate a cache key from text, voice and speed
     */
    private generateKey(text: string, voice: string, speed: number): string {
        // Simple hash function for the text
        const textHash = this.hashText(text);
        return `${voice}_${speed}_${textHash}`;
    }
    
    /**
     * Simple hash function for text
     */
    private hashText(text: string): string {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
    
    /**
     * Get audio from cache if available
     * @returns The cached audio content or null if not found
     */
    get(text: string, voice: string, speed: number): string | null {
        const key = this.generateKey(text, voice, speed);
        const cachedItem = this.cache.get(key);
        
        if (cachedItem) {
            // Check if the cache item is still valid (not expired)
            if (Date.now() - cachedItem.timestamp <= this.maxCacheAge) {
                this.stats.hits++;
                console.log(`Cache hit for text: ${text.substring(0, 20)}...`);
                return cachedItem.audioContent;
            } else {
                // Remove expired item
                this.cache.delete(key);
                this.stats.size = this.cache.size;
            }
        }
        
        this.stats.misses++;
        console.log(`Cache miss for text: ${text.substring(0, 20)}...`);
        return null;
    }
    
    /**
     * Add audio to cache
     */
    set(text: string, voice: string, speed: number, audioContent: string): void {
        const key = this.generateKey(text, voice, speed);
        
        // First, check if we need to clean up old items
        this.cleanup();
        
        // Store the new item
        this.cache.set(key, {
            audioContent,
            timestamp: Date.now(),
            voice,
            speed,
            textHash: this.hashText(text)
        });
        
        this.stats.size = this.cache.size;
        console.log(`Cached audio for text: ${text.substring(0, 20)}..., cache size: ${this.cache.size}`);
        
        // Save to storage
        this.saveToStorage();
    }
    
    /**
     * Clean up old and excess cache items
     */
    private cleanup(): void {
        // Only run cleanup periodically (once per hour)
        const hourInMs = 60 * 60 * 1000;
        if (Date.now() - this.stats.lastCleanup < hourInMs && this.cache.size < this.maxCacheSize) {
            return;
        }
        
        console.log('Running cache cleanup...');
        this.stats.lastCleanup = Date.now();
        
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest items if we're at capacity
            const sortedByAge = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // Delete 20% of oldest items
            const itemsToRemove = Math.max(1, Math.floor(this.maxCacheSize * 0.2));
            
            for (let i = 0; i < itemsToRemove && i < sortedByAge.length; i++) {
                this.cache.delete(sortedByAge[i][0]);
            }
            
            console.log(`Removed ${itemsToRemove} oldest items from cache`);
        }
        
        // Remove expired items
        const now = Date.now();
        let expiredCount = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.maxCacheAge) {
                this.cache.delete(key);
                expiredCount++;
            }
        }
        
        if (expiredCount > 0) {
            console.log(`Removed ${expiredCount} expired items from cache`);
        }
        
        this.stats.size = this.cache.size;
        this.saveToStorage();
    }
    
    /**
     * Save cache to chrome.storage.local
     */
    private saveToStorage(): void {
        // Convert Map to array for storage
        const cacheArray = Array.from(this.cache.entries());
        
        // Only store up to 50 items in persistent storage to avoid quota issues
        const storageLimit = 50;
        const toStore = cacheArray.slice(0, storageLimit);
        
        chrome.storage.local.set({ 
            ttsAudioCache: toStore,
            ttsCacheStats: this.stats
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to save cache to storage:', chrome.runtime.lastError);
            } else {
                console.log(`Saved ${toStore.length} cache items to storage`);
            }
        });
    }
    
    /**
     * Load cache from chrome.storage.local
     */
    private loadFromStorage(): void {
        chrome.storage.local.get(['ttsAudioCache', 'ttsCacheStats'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to load cache from storage:', chrome.runtime.lastError);
                return;
            }
            
            if (result.ttsAudioCache && Array.isArray(result.ttsAudioCache)) {
                // Restore Map from stored array
                for (const [key, value] of result.ttsAudioCache) {
                    this.cache.set(key, value);
                }
                console.log(`Loaded ${this.cache.size} items from cache storage`);
            }
            
            if (result.ttsCacheStats) {
                this.stats = {...this.stats, ...result.ttsCacheStats};
                console.log('Loaded cache stats:', this.stats);
            }
            
            this.stats.size = this.cache.size;
            
            // Run cleanup on load to remove any expired items
            this.cleanup();
        });
    }
    
    /**
     * Clear all cached items
     */
    clear(): void {
        this.cache.clear();
        this.stats.size = 0;
        this.stats.hits = 0;
        this.stats.misses = 0;
        
        chrome.storage.local.remove(['ttsAudioCache', 'ttsCacheStats'], () => {
            console.log('Cache cleared from storage');
        });
    }
    
    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return {...this.stats};
    }
}

// Export singleton instance
export const audioCache = new AudioCache();

// Export types
export type { CachedAudio, CacheStats };
