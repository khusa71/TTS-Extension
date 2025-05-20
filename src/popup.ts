// TypeScript version of popup.js
import { initUI, updateVoiceInfo, initShortcuts, UIConfig } from './ui';
import { PlaybackSettings } from './settings';

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const saveApiKeyButton = document.getElementById('saveApiKey') as HTMLButtonElement;
    const apiKeyStatus = document.getElementById('apiKeyStatus') as HTMLElement;
    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
    const voiceInfo = document.getElementById('voiceInfo') as HTMLElement;
    const speedRange = document.getElementById('speedRange') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue') as HTMLElement;
    const speedPresets = document.querySelectorAll('.speed-preset') as NodeListOf<HTMLButtonElement>;
    const readSelectedBtn = document.getElementById('readSelected') as HTMLButtonElement;
    const readPageBtn = document.getElementById('readPage') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause') as HTMLButtonElement;
    const resumeBtn = document.getElementById('resume') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop') as HTMLButtonElement;
    const nextBtn = document.getElementById('next') as HTMLButtonElement;
    const previousBtn = document.getElementById('previous') as HTMLButtonElement;
    const enableHighlight = document.getElementById('enableHighlight') as HTMLInputElement;
    const highlightOptions = document.getElementsByName('highlightType') as NodeListOf<HTMLInputElement>;
    const progressContainer = document.getElementById('progress-container') as HTMLElement;
    const progressFill = document.getElementById('progress-fill') as HTMLElement;
    const currentTimeEl = document.getElementById('currentTime') as HTMLElement;
    const totalTimeEl = document.getElementById('totalTime') as HTMLElement;
    const onboardingModal = document.getElementById('onboardingModal') as HTMLElement;
    const closeOnboarding = document.getElementById('closeOnboarding') as HTMLElement;
    const themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;

    // Modular UI initialization
    const uiConfig: UIConfig = {
        onboardingModal,
        closeOnboarding,
        themeToggle,
        apiKeyStatus,
        speedRange,
        speedValue,
        speedPresets,
        enableHighlight,
        highlightOptions,
        showOnboardingCallback: (showOnboarding: () => void) => {
            // Expose if needed
        },
        hideOnboardingCallback: (hideOnboarding: () => void) => {
            // Expose if needed
        },
        updateSpeedPresets: (currentSpeed: number) => {
            speedPresets.forEach(preset => {
                const presetSpeed = parseFloat(preset.dataset.speed || '1');
                preset.classList.toggle('active', presetSpeed === parseFloat(currentSpeed.toString()));
            });
        },
        updateSettings: (settings: Partial<PlaybackSettings>) => {
            // Handle settings update
        },
        showStatusCallback: (message: string, isError: boolean) => {
            // Handle status message display
        }
    };

    initUI(uiConfig);

    // Fetch and populate available voices
    const populateVoiceDropdown = () => {
        console.log('Fetching available voices from Google Cloud TTS API...'); // Debug log

        chrome.storage.local.get(['googleApiKey'], (result: { googleApiKey?: string }) => {
            const userApiKey = result.googleApiKey;

            if (!userApiKey) {
                console.error('API key is missing. Please set it in the extension settings.');
                return;
            }

            const url = 'https://texttospeech.googleapis.com/v1/voices?key=' + userApiKey;

            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error fetching voices: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(data => {
                    const voices: Array<{ name: string; languageCodes: string[]; ssmlGender: string }> = data.voices || [];
                    console.log('Voices fetched from Google Cloud TTS API:', voices); // Debug log

                    voiceSelect.innerHTML = ''; // Clear existing options
                    voices.forEach((voice) => {
                        const option = document.createElement('option');
                        option.value = voice.name;
                        option.textContent = `${voice.name} (${voice.languageCodes.join(', ')})`;
                        option.dataset.language = voice.languageCodes[0];
                        option.dataset.gender = voice.ssmlGender || 'unknown';
                        voiceSelect.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error fetching voices from Google Cloud TTS API:', error);
                });
        });
    };

    // Populate voices on load
    populateVoiceDropdown();

    // Example of adding voice selection event handlers
    const updateVoiceSelection = (voiceName: string) => {
        console.log('Updating voice selection to:', voiceName); // Debug log
        if (voiceSelect.value !== voiceName) {
            voiceSelect.value = voiceName;
            // Update voice info UI
            const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
            if (selectedOption) {
                console.log('Selected option:', selectedOption); // Debug log
                updateVoiceInfo({
                    name: selectedOption.value,
                    language: selectedOption.dataset.language || '',
                    gender: selectedOption.dataset.gender || '',
                    type: selectedOption.dataset.type || ''
                }, voiceInfo);
            }
        }
    };

    // Example of handling API key saving
    saveApiKeyButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ googleApiKey: apiKey }, () => {
                chrome.runtime.sendMessage({ action: "apiKeyUpdated", newKey: apiKey });
                apiKeyStatus.textContent = 'API Key saved successfully!';
                apiKeyStatus.className = 'success-message';
                setTimeout(() => { apiKeyStatus.textContent = ''; }, 3000);
            });
        } else {
            apiKeyStatus.textContent = 'Please enter a valid API key.';
            apiKeyStatus.className = 'error-message';
        }
    });

    // Additional event handlers and logic would continue here
});
