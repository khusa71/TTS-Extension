export interface HighlightOptions {
    enabled: boolean;
    type: 'word' | 'sentence';
    color: string;
    backgroundColor: string;
    useBold: boolean;
    useUnderline: boolean;
    transitionSpeed: 'slow' | 'medium' | 'fast';
}
export declare const DEFAULT_HIGHLIGHT_OPTIONS: HighlightOptions;
export declare function applyHighlightStyle(element: HTMLElement, options: HighlightOptions): void;
export declare function generateHighlightCSS(options: HighlightOptions): string;
export declare function normalizeColor(color: string): string;
export declare function saveHighlightOptions(options: HighlightOptions): void;
export declare function loadHighlightOptions(callback: (options: HighlightOptions) => void): void;
