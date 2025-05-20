import { PlaybackSettings } from './settings';
export interface UIConfig {
    onboardingModal: HTMLElement;
    closeOnboarding: HTMLElement;
    themeToggle: HTMLButtonElement;
    apiKeyStatus: HTMLElement;
    speedRange: HTMLInputElement;
    speedValue: HTMLElement;
    speedPresets: NodeListOf<HTMLButtonElement>;
    enableHighlight: HTMLInputElement;
    highlightOptions: NodeListOf<HTMLInputElement>;
    showOnboardingCallback?: (showOnboardingFn: () => void) => void;
    hideOnboardingCallback?: (hideOnboardingFn: () => void) => void;
    updateSpeedPresets: (currentSpeed: number) => void;
    updateSettings: (settings: Partial<PlaybackSettings>) => void;
    showStatusCallback?: (message: string, isError: boolean) => void;
}
export interface VoiceInfo {
    name: string;
    language: string;
    gender: string;
    type: string;
}
export declare function initUI(config: UIConfig): void;
export declare function updateVoiceInfo(voice: VoiceInfo, voiceInfoElement: HTMLElement): void;
export declare function initShortcuts(callbacks: {
    play: () => void;
    pause: () => void;
    stop: () => void;
    next: () => void;
    previous: () => void;
    readPage: () => void;
    readSelection: () => void;
}): void;
