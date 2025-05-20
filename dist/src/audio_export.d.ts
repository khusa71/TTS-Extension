export interface ExportOptions {
    format: 'mp3' | 'wav';
    quality: 'standard' | 'high';
    splitByParagraph: boolean;
    filename: string;
}
export declare const DEFAULT_EXPORT_OPTIONS: ExportOptions;
export declare function exportAudio(audioData: string, options: ExportOptions): void;
export declare function splitIntoParagraphs(text: string): string[];
export declare function saveExportOptions(options: ExportOptions): void;
export declare function loadExportOptions(callback: (options: ExportOptions) => void): void;
