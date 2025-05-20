// Performance and error recovery improvements for background service worker
/// <reference types="chrome" />

export interface PerformanceConfig {
  enableCaching: boolean;
  maxCacheSize: number;         // Number of audio clips to keep in memory
  audioChunkTimeout: number;    // Milliseconds to wait before timing out chunk requests
  maxRetries: number;           // Maximum number of retry attempts for failed requests
  retryDelay: number;           // Milliseconds to wait between retries
  useRequestBatching: boolean;  // Combine similar requests
  batchWindow: number;          // Milliseconds to wait for batching similar requests
  logPerformanceMetrics: boolean;
}

// Default performance configuration
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableCaching: true,
  maxCacheSize: 20,
  audioChunkTimeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
  useRequestBatching: true,
  batchWindow: 100,
  logPerformanceMetrics: false
};

// In-memory audio cache (LRU cache implementation)
class AudioCache {
  private cache: Map<string, { data: string, lastAccessed: number }>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (item) {
      // Update last accessed time
      item.lastAccessed = Date.now();
      return item.data;
    }
    return null;
  }

  set(key: string, data: string): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      let oldestKey = '';
      let oldestTime = Infinity;
      
      for (const [k, v] of this.cache.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, { data, lastAccessed: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Performance metrics tracking
class PerformanceTracker {
  private metrics = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiErrors: 0,
    retries: 0,
    avgResponseTime: 0,
    totalResponseTime: 0
  };

  constructor() {
    this.reset();
  }

  reset(): void {
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiErrors: 0,
      retries: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }

  recordApiCall(responseTime: number): void {
    this.metrics.apiCalls++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.avgResponseTime = this.metrics.totalResponseTime / this.metrics.apiCalls;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordApiError(): void {
    this.metrics.apiErrors++;
  }

  recordRetry(): void {
    this.metrics.retries++;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Request batcher to combine similar requests
class RequestBatcher {
  private batchWindow: number;
  private batchQueue: Map<string, {
    texts: string[];
    voice: string;
    speed: number;
    resolve: (result: any) => void;
    reject: (error: any) => void;
    timer: number;
  }>;

  constructor(batchWindow: number) {
    this.batchWindow = batchWindow;
    this.batchQueue = new Map();
  }

  addRequest(
    text: string, 
    voice: string, 
    speed: number
  ): Promise<any> {
    const key = `${voice}_${speed}`;
    
    return new Promise((resolve, reject) => {
      if (this.batchQueue.has(key)) {
        // Add to existing batch
        const batch = this.batchQueue.get(key)!;
        batch.texts.push(text);
        
        // Create a new combined resolve/reject handler
        const originalResolve = batch.resolve;
        batch.resolve = (results) => {
          originalResolve(results);
          resolve(results);
        };
        
        const originalReject = batch.reject;
        batch.reject = (error) => {
          originalReject(error);
          reject(error);
        };
      } else {
        // Create new batch
        const timer = window.setTimeout(() => {
          this.processBatch(key);
        }, this.batchWindow);
        
        this.batchQueue.set(key, {
          texts: [text],
          voice,
          speed,
          resolve,
          reject,
          timer
        });
      }
    });
  }

  private processBatch(key: string): void {
    const batch = this.batchQueue.get(key);
    if (!batch) return;
    
    // Clear the timeout
    clearTimeout(batch.timer);
    
    // Process the batch (implementation depends on your specific needs)
    // For example, you might concatenate all texts and make a single API call
    // Then distribute the results back to each requester
    
    // After processing, remove from queue
    this.batchQueue.delete(key);
  }

  clear(): void {
    for (const [key, batch] of this.batchQueue.entries()) {
      clearTimeout(batch.timer);
      batch.reject(new Error('Batch cleared'));
      this.batchQueue.delete(key);
    }
  }
}

// Create the service objects
let cache: AudioCache;
let performanceTracker: PerformanceTracker;
let requestBatcher: RequestBatcher;
let config: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG;

// Initialize the performance optimization system
export function initPerformanceOptimizations(customConfig?: Partial<PerformanceConfig>): void {
  // Apply custom config
  config = { ...DEFAULT_PERFORMANCE_CONFIG, ...customConfig };
  
  // Initialize components
  cache = new AudioCache(config.maxCacheSize);
  performanceTracker = new PerformanceTracker();
  requestBatcher = new RequestBatcher(config.batchWindow);
  
  // Load any saved configuration
  chrome.storage.local.get(['performanceConfig'], (result: {performanceConfig?: PerformanceConfig}) => {
    if (result.performanceConfig) {
      config = { ...config, ...result.performanceConfig };
    }
  });
}

// Save performance configuration
export function savePerformanceConfig(newConfig: Partial<PerformanceConfig>): void {
  config = { ...config, ...newConfig };
  chrome.storage.local.set({ performanceConfig: config });
}

// Get current performance metrics
export function getPerformanceMetrics(): any {
  return performanceTracker.getMetrics();
}

// Reset performance metrics
export function resetPerformanceMetrics(): void {
  performanceTracker.reset();
}

// Function to retry a failed request with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = config.maxRetries,
  retryDelay: number = config.retryDelay
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const result = await operation();
      
      // Record success metrics
      if (config.logPerformanceMetrics) {
        const responseTime = Date.now() - startTime;
        performanceTracker.recordApiCall(responseTime);
      }
      
      return result;
    } catch (error) {
      if (config.logPerformanceMetrics) {
        performanceTracker.recordApiError();
      }
      
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Calculate exponential backoff with jitter
        const delay = retryDelay * Math.pow(2, attempt) + 
                     Math.floor(Math.random() * 100);
        
        if (config.logPerformanceMetrics) {
          performanceTracker.recordRetry();
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError;
}