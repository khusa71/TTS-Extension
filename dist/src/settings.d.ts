export interface PlaybackSettings {
    speed: number;
    highlightType: 'word' | 'sentence';
    enableHighlight: boolean;
}
export declare function loadSettings(callback: (settings: PlaybackSettings) => void): void;
export declare function saveSettings(newSettings: Partial<PlaybackSettings>, callback?: () => void): void;
export declare function getThemePreference(): boolean;
export declare function setThemePreference(isDark: boolean): void;
export declare function saveApiKey(apiKey: string, callback?: () => void): void;
export declare function loadApiKey(callback: (apiKey: string | null) => void): void;
