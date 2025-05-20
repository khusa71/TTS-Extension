// settings.ts - Typed version of settings.js
// Handles loading, saving, and updating extension settings

export interface PlaybackSettings {
  speed: number;
  highlightType: 'word' | 'sentence';
  enableHighlight: boolean;
}

export function loadSettings(callback: (settings: PlaybackSettings) => void): void {
    chrome.storage.local.get(['playbackSettings'], (result: {playbackSettings?: PlaybackSettings}) => {
        const settings: PlaybackSettings = result.playbackSettings || {
            speed: 1,
            highlightType: 'word',
            enableHighlight: true
        };
        callback(settings);
    });
}

export function saveSettings(newSettings: Partial<PlaybackSettings>, callback?: () => void): void {
    chrome.storage.local.get(['playbackSettings'], (result: {playbackSettings?: PlaybackSettings}) => {
        const currentSettings: PlaybackSettings = result.playbackSettings || {
            speed: 1,
            highlightType: 'word',
            enableHighlight: true
        };
        const updatedSettings: PlaybackSettings = { ...currentSettings, ...newSettings };
        if (callback) {
            chrome.storage.local.set({ playbackSettings: updatedSettings }, callback);
        } else {
            chrome.storage.local.set({ playbackSettings: updatedSettings });
        }
        chrome.runtime.sendMessage({ action: "updateSettings", settings: updatedSettings });
    });
}

export function getThemePreference(): boolean {
    return localStorage.getItem('tts_theme_dark') === '1';
}

export function setThemePreference(isDark: boolean): void {
    localStorage.setItem('tts_theme_dark', isDark ? '1' : '0');
}

export function saveApiKey(apiKey: string, callback?: () => void): void {
    chrome.storage.local.set({ googleApiKey: apiKey }, () => {
        chrome.runtime.sendMessage({ action: "apiKeyUpdated", newKey: apiKey });
        if (callback) callback();
    });
}

export function loadApiKey(callback: (apiKey: string | null) => void): void {
    chrome.storage.local.get(['googleApiKey'], (result: { googleApiKey?: string }) => {
        callback(result.googleApiKey || null);
    });
}
