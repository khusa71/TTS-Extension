// ui.ts - Handles UI rendering, onboarding, theme, ARIA/status, modal, tooltips, etc.
import { PlaybackSettings, getThemePreference, setThemePreference } from './settings';

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

export function initUI(config: UIConfig): void {
    const {
        onboardingModal,
        closeOnboarding,
        themeToggle,
        apiKeyStatus,
        speedRange,
        speedValue,
        speedPresets,
        enableHighlight,
        highlightOptions,
        showOnboardingCallback,
        hideOnboardingCallback,
        updateSpeedPresets,
        updateSettings,
        showStatusCallback
    } = config;

    // Onboarding modal logic
    function showOnboarding(): void {
        onboardingModal.style.display = 'flex';
        closeOnboarding.focus();
    }
    
    function hideOnboarding(): void {
        onboardingModal.style.display = 'none';
    }
    
    if (closeOnboarding) closeOnboarding.addEventListener('click', hideOnboarding);
    
    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (onboardingModal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Enter')) hideOnboarding();
    });
    
    // Show onboarding on first run
    if (!localStorage.getItem('tts_onboarded')) {
        setTimeout(showOnboarding, 400);
        localStorage.setItem('tts_onboarded', '1');
    }
    
    if (showOnboardingCallback) showOnboardingCallback(showOnboarding);
    if (hideOnboardingCallback) hideOnboardingCallback(hideOnboarding);

    // Theme toggle logic
    function setTheme(dark: boolean): void {
        document.body.classList.toggle('dark-mode', dark);
        if (themeToggle) {
            themeToggle.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    }
    
    // Load theme preference
    const darkPref = getThemePreference();
    setTheme(darkPref);
    
    themeToggle && themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        setThemePreference(isDark);
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    // Status message display
    function showStatus(message: string, isError: boolean = false): void {
        if (apiKeyStatus) {
            apiKeyStatus.textContent = message;
            apiKeyStatus.className = isError ? 'error-message' : 'success-message';
            setTimeout(() => { apiKeyStatus.textContent = ''; }, 3000);
        }
        
        if (showStatusCallback) {
            showStatusCallback(message, isError);
        }
    }

    // Initialize tooltips
    document.querySelectorAll('.help-icon').forEach((el) => {
        const tooltip = (el as HTMLElement).getAttribute('title');
        if (tooltip) {
            (el as HTMLElement).setAttribute('aria-label', tooltip);
            (el as HTMLElement).setAttribute('role', 'tooltip');
        }
    });
}

export function updateVoiceInfo(voice: VoiceInfo, voiceInfoElement: HTMLElement): void {
    if (!voiceInfoElement) return;
    
    const typeLabels: Record<string, string> = {
        'Neural2': '<span class="badge neural">Neural2</span>',
        'WaveNet': '<span class="badge wavenet">WaveNet</span>',
        'Standard': '<span class="badge standard">Standard</span>'
    };
    
    const typeLabel = typeLabels[voice.type] || '';
    
    voiceInfoElement.innerHTML = `
        <div class="voice-detail">
            <span class="voice-language">${voice.language}</span>
            <span class="voice-gender">${voice.gender}</span>
            ${typeLabel}
        </div>
    `;
}

export function initShortcuts(callbacks: {
    play: () => void,
    pause: () => void,
    stop: () => void,
    next: () => void,
    previous: () => void,
    readPage: () => void,
    readSelection: () => void
}): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        // Only process if not in an input/textarea
        if (e.target instanceof HTMLElement &&
            (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            return;
        }
        
        switch (e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                callbacks.play();
                break;
            case 's':
                callbacks.stop();
                break;
            case 'n':
                callbacks.next();
                break;
            case 'p':
                callbacks.previous();
                break;
            case 'r':
                callbacks.readPage();
                break;
            case 'l':
                callbacks.readSelection();
                break;
        }
    });
}
