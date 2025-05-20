export interface PerformanceConfig {
    enableCaching: boolean;
    maxCacheSize: number;
    audioChunkTimeout: number;
    maxRetries: number;
    retryDelay: number;
    useRequestBatching: boolean;
    batchWindow: number;
    logPerformanceMetrics: boolean;
}
export declare const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig;
export declare function initPerformanceOptimizations(customConfig?: Partial<PerformanceConfig>): void;
export declare function savePerformanceConfig(newConfig: Partial<PerformanceConfig>): void;
export declare function getPerformanceMetrics(): any;
export declare function resetPerformanceMetrics(): void;
export declare function retryWithBackoff<T>(operation: () => Promise<T>, maxRetries?: number, retryDelay?: number): Promise<T>;
