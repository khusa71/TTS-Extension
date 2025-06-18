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

    // Enhanced API key validation and voice fetching
    function validateAndFetchVoices(apiKey: string): void {
        if (!apiKey) {
            console.error('API key is missing');
            apiKeyStatus.textContent = 'Error: API key is missing. Please set it below.';
            apiKeyStatus.style.color = 'red';
            voiceSelect.innerHTML = '<option value="">No API key - voices unavailable</option>';
            return;
        }

        // Validate key format (basic check)
        if (!/^[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
            console.error('API key appears to be invalid (format check failed)');
            apiKeyStatus.textContent = 'Error: API key appears to be invalid (wrong format).';
            apiKeyStatus.style.color = 'red';
            voiceSelect.innerHTML = '<option value="">Invalid API key format</option>';
            return;
        }

        // Show loading indicators
        apiKeyStatus.textContent = 'Validating API key...';
        apiKeyStatus.style.color = 'blue';
        const loadingOption = document.createElement('option');
        loadingOption.textContent = 'Loading voices...';
        voiceSelect.innerHTML = '';
        voiceSelect.appendChild(loadingOption);

        // Add loading spinner to voice select
        const voiceSelectContainer = voiceSelect.parentElement;
        let loadingSpinner = voiceSelectContainer?.querySelector('.voice-loading-spinner') as HTMLElement;
        if (!loadingSpinner && voiceSelectContainer) {
            loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'voice-loading-spinner';
            loadingSpinner.style.display = 'inline-block';
            loadingSpinner.style.width = '20px';
            loadingSpinner.style.height = '20px';
            loadingSpinner.style.border = '3px solid rgba(0, 0, 0, 0.1)';
            loadingSpinner.style.borderRadius = '50%';
            loadingSpinner.style.borderTopColor = '#3498db';
            loadingSpinner.style.animation = 'spin 1s ease-in-out infinite';
            loadingSpinner.style.marginLeft = '10px';
            voiceSelectContainer.appendChild(loadingSpinner);
        } else if (loadingSpinner) {
            loadingSpinner.style.display = 'inline-block';
        }

        const url = 'https://texttospeech.googleapis.com/v1/voices?key=' + apiKey;
        
        console.log('Sending fetch request to Google Cloud TTS API voices endpoint');
        fetch(url)
            .then(response => {
                console.log('Response received:', response.status, response.statusText);
                
                if (!response.ok) {
                    if (response.status === 400) {
                        throw new Error('API key format is invalid. Please check for typos or generate a new key.');
                    } else if (response.status === 403) {
                        throw new Error('API key is invalid or Text-to-Speech API is not enabled in your Google Cloud Console.');
                    } else if (response.status === 404) {
                        throw new Error('API endpoint not found. Check if the Text-to-Speech API is enabled.');
                    } else if (response.status === 429) {
                        throw new Error('API rate limit exceeded. Please try again later.');
                    } else {
                        throw new Error(`Error fetching voices: ${response.status} ${response.statusText}`);
                    }
                }
                return response.json();
            })
            .then(data => {
                if (!data.voices || !Array.isArray(data.voices) || data.voices.length === 0) {
                    throw new Error('No voices returned from the API. Verify your API key permissions.');
                }
                
                const voices: Array<{ name: string; languageCodes: string[]; ssmlGender: string }> = data.voices;
                console.log(`Successfully fetched ${voices.length} voices from Google Cloud TTS API`);
                
                // Update API status indicator with success
                apiKeyStatus.textContent = 'API key valid ✓';
                apiKeyStatus.style.color = 'green';

                voiceSelect.innerHTML = ''; // Clear existing options
                
                // Sort voices by language
                voices.sort((a, b) => {
                    const langA = a.languageCodes[0];
                    const langB = b.languageCodes[0];
                    return langA.localeCompare(langB);
                });
                
                // Group voices by language for better organization
                const languageGroups = new Map<string, typeof voices>();
                
                voices.forEach(voice => {
                    const langCode = voice.languageCodes[0];
                    if (!languageGroups.has(langCode)) {
                        languageGroups.set(langCode, []);
                    }
                    languageGroups.get(langCode)!.push(voice);
                });
                
                // Get language names for better display
                const languageNames = new Intl.DisplayNames(['en'], { type: 'language' });
                
                // Create option groups for each language
                languageGroups.forEach((voicesInLang, langCode) => {
                    const group = document.createElement('optgroup');
                    try {
                        const langName = languageNames.of(langCode.split('-')[0]) || langCode;
                        group.label = `${langName} (${langCode}) - ${voicesInLang.length} voices`;
                    } catch (e) {
                        group.label = `${langCode} (${voicesInLang.length} voices)`;
                    }
                    
                    // Sort voices by type (Neural2 > Wavenet > Standard) and gender
                    voicesInLang.sort((a, b) => {
                        // First sort by voice type
                        const typeA = getVoiceType(a.name);
                        const typeB = getVoiceType(b.name);
                        
                        const typeOrder: {[key: string]: number} = { 
                            'Neural2': 4, 
                            'Studio': 3, 
                            'Wavenet': 2, 
                            'Standard': 1 
                        };
                        
                        const typeDiff = (typeOrder[typeB] || 0) - (typeOrder[typeA] || 0);
                        if (typeDiff !== 0) return typeDiff;
                        
                        // If same type, sort by gender (Female, Male, Neutral)
                        return a.ssmlGender.localeCompare(b.ssmlGender);
                    });
                    
                    voicesInLang.forEach(voice => {
                        const option = document.createElement('option');
                        option.value = voice.name;
                        
                        // Determine voice type for display
                        const voiceType = getVoiceType(voice.name);
                        const isPremium = voiceType !== 'Standard';
                        
                        option.textContent = `${voice.name} (${voiceType}${isPremium ? ' $' : ''}, ${voice.ssmlGender})`;
                        option.dataset.language = voice.languageCodes[0];
                        option.dataset.gender = voice.ssmlGender || 'unknown';
                        option.dataset.type = voiceType;
                        
                        group.appendChild(option);
                    });
                    
                    voiceSelect.appendChild(group);
                });
                
                // Restore previous selection or select first available
                chrome.storage.local.get(['selectedVoice'], (result) => {
                    if (result.selectedVoice) {
                        // Try to find and select the previously selected voice
                        for (let i = 0; i < voiceSelect.options.length; i++) {
                            if (voiceSelect.options[i].value === result.selectedVoice) {
                                voiceSelect.selectedIndex = i;
                                break;
                            }
                        }
                    }
                    
                    // If no voice was selected, select the first one
                    if (voiceSelect.selectedIndex === -1 && voiceSelect.options.length > 0) {
                        voiceSelect.selectedIndex = 0;
                    }
                    
                    // Update voice info display
                    const selectedOption = voiceSelect.options[voiceSelect.selectedIndex] as HTMLOptionElement;
                    if (selectedOption) {
                        updateVoiceInfo({
                            name: selectedOption.value,
                            language: selectedOption.dataset.language || '',
                            gender: selectedOption.dataset.gender || '',
                            type: selectedOption.dataset.type || ''
                        }, voiceInfo);
                    }
                });
                
                // Add search/filter functionality for voices
                addVoiceSearchFilter();
            })
            .catch(error => {
                console.error('Error fetching voices from Google Cloud TTS API:', error);
                apiKeyStatus.textContent = `Error: ${error.message}`;
                apiKeyStatus.style.color = 'red';
                voiceSelect.innerHTML = '<option value="">Failed to load voices</option>';
                
                // Show diagnostic link on error
                const diagnosticLink = document.getElementById('diagnosticLinkContainer');
                if (diagnosticLink) {
                    diagnosticLink.style.display = 'block';
                }
            })
            .finally(() => {
                // Hide the loading spinner
                if (loadingSpinner) {
                    loadingSpinner.style.display = 'none';
                }
            });
    }

    // Helper function to determine voice type from name
    function getVoiceType(voiceName: string): string {
        if (voiceName.includes('Neural2')) return 'Neural2';
        if (voiceName.includes('Studio')) return 'Studio';
        if (voiceName.includes('Wavenet')) return 'Wavenet';
        return 'Standard';
    }

    // Add search/filter functionality for voices
    function addVoiceSearchFilter(): void {
        // Check if a search box already exists
        let searchBox = document.getElementById('voiceSearch') as HTMLInputElement;
        
        if (!searchBox) {
            // Create and add the search box
            searchBox = document.createElement('input');
            searchBox.id = 'voiceSearch';
            searchBox.type = 'text';
            searchBox.placeholder = 'Search voices by name or language...';
            searchBox.style.width = '100%';
            searchBox.style.marginBottom = '10px';
            searchBox.style.padding = '5px';
            searchBox.style.boxSizing = 'border-box';
            
            // Insert before the voice select
            voiceSelect.parentNode?.insertBefore(searchBox, voiceSelect);
            
            // Add event listener for filtering
            searchBox.addEventListener('input', filterVoices);
        }
    }

    // Filter voices based on search term
    function filterVoices(event: Event): void {
        const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
        
        // Go through all option groups and options
        const optgroups = voiceSelect.querySelectorAll('optgroup');
        let visibleGroups = 0;
        
        optgroups.forEach(group => {
            const options = group.querySelectorAll('option');
            let visibleOptions = 0;
            
            options.forEach(option => {
                const text = option.textContent?.toLowerCase() || '';
                const language = (option as HTMLOptionElement).dataset.language?.toLowerCase() || '';
                const visible = text.includes(searchTerm) || language.includes(searchTerm);
                
                // Hide or show the option
                option.style.display = visible ? '' : 'none';
                if (visible) visibleOptions++;
            });
            
            // Hide or show the entire group
            group.style.display = visibleOptions > 0 ? '' : 'none';
            if (visibleOptions > 0) visibleGroups++;
        });
        
        // Show a message if no matches
        let noMatchesMessage = document.getElementById('noVoiceMatches');
        if (visibleGroups === 0) {
            if (!noMatchesMessage) {
                noMatchesMessage = document.createElement('div');
                noMatchesMessage.id = 'noVoiceMatches';
                noMatchesMessage.textContent = 'No voices match your search';
                noMatchesMessage.style.color = 'red';
                noMatchesMessage.style.marginTop = '5px';
                voiceSelect.parentNode?.insertBefore(noMatchesMessage, voiceSelect.nextSibling);
            } else {
                noMatchesMessage.style.display = '';
            }
        } else if (noMatchesMessage) {
            noMatchesMessage.style.display = 'none';
        }
    }

    // Populate voices on load
    chrome.storage.local.get(['googleApiKey'], (result: { googleApiKey?: string }) => {
        const userApiKey = result.googleApiKey;
        validateAndFetchVoices(userApiKey || '');
    });
    
    // Add auto-detect language button next to voice selection
    const voiceSelectContainer = document.querySelector('.voice-section') as HTMLElement;
    if (voiceSelectContainer) {
        const autoDetectDiv = document.createElement('div');
        autoDetectDiv.className = 'auto-detect-language';
        autoDetectDiv.innerHTML = `
            <button id="autoDetectLanguage" class="secondary-button auto-detect-btn">
                <i class="fas fa-magic"></i> Auto-detect language
            </button>
            <div class="detected-language-info" id="detectedLanguageInfo" style="display: none;"></div>
        `;
        
        // Add after the voice select but before the voice info
        const voiceInfo = document.getElementById('voiceInfo');
        if (voiceInfo) {
            voiceInfo.parentNode?.insertBefore(autoDetectDiv, voiceInfo);
        } else {
            voiceSelectContainer.appendChild(autoDetectDiv);
        }
        
        // Add event listener for the auto-detect button
        const autoDetectButton = document.getElementById('autoDetectLanguage');
        if (autoDetectButton) {
            autoDetectButton.addEventListener('click', () => {
                // Get the current text from the active tab
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            func: () => {
                                const selection = window.getSelection();
                                return selection?.toString() || '';
                            }
                        }, (result) => {
                            // Check if we got a text selection
                            if (result && result[0]?.result) {
                                const selectedText = result[0].result as string;
                                
                                if (selectedText) {
                                    // Get current speed setting
                                    const speedRange = document.getElementById('speedRange') as HTMLInputElement;
                                    const speed = speedRange ? parseFloat(speedRange.value) : 1;
                                    
                                    // Get available voices from select
                                    const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
                                    const voices = Array.from(voiceSelect.options).map(option => {
                                        // Extract voice details from the option
                                        return {
                                            name: option.value,
                                            languageCode: option.dataset.language || '',
                                            gender: option.dataset.gender || '',
                                            type: option.dataset.type || ''
                                        };
                                    });
                                    
                                    // First, set available voices in the background
                                    chrome.runtime.sendMessage({
                                        action: 'setAvailableVoices',
                                        voices
                                    }, () => {
                                        // Then request auto-detection and playback
                                        chrome.runtime.sendMessage({
                                            action: 'autoDetectLanguage',
                                            text: selectedText,
                                            speed
                                        });
                                    });
                                    
                                    // Show user feedback
                                    const detectedLanguageInfo = document.getElementById('detectedLanguageInfo');
                                    if (detectedLanguageInfo) {
                                        detectedLanguageInfo.textContent = 'Detecting language...';
                                        detectedLanguageInfo.style.display = 'block';
                                    }
                                } else {
                                    alert('Please select some text on the page first');
                                }
                            } else {
                                alert('Could not access page text. Please make sure you have selected text in the page.');
                            }
                        });
                    }
                });
            });
        }
    }
    
    // Listen for language detection info messages
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'ttsInfo' && message.info?.includes('Detected language')) {
            const detectedLanguageInfo = document.getElementById('detectedLanguageInfo');
            if (detectedLanguageInfo) {
                detectedLanguageInfo.textContent = message.info;
                detectedLanguageInfo.style.display = 'block';
                
                // Highlight with appropriate styling
                detectedLanguageInfo.className = 'detected-language-info success';
            }
        }
        return true;
    });
    
    // Handle voice preference changes
    const genderPreference = document.getElementById('voiceGenderPreference') as HTMLSelectElement;
    const typePreference = document.getElementById('voiceTypePreference') as HTMLSelectElement;
    
    if (genderPreference && typePreference) {
        // Load saved preferences
        chrome.storage.local.get(['voicePreferences'], (result) => {
            const prefs = result.voicePreferences || {};
            
            if (prefs.gender) {
                genderPreference.value = prefs.gender;
            }
            
            if (prefs.voiceType) {
                typePreference.value = prefs.voiceType;
            }
        });
        
        // Save preferences when changed
        const saveVoicePreferences = () => {
            const preferences = {
                gender: genderPreference.value || undefined,
                voiceType: typePreference.value || undefined
            };
            
            chrome.storage.local.set({ voicePreferences: preferences }, () => {
                console.log('Voice preferences saved:', preferences);
                
                // Show brief confirmation
                const saveConfirmation = document.createElement('div');
                saveConfirmation.className = 'save-confirmation';
                saveConfirmation.textContent = 'Preferences saved';
                
                const container = genderPreference.closest('.voice-pref-section');
                if (container) {
                    container.appendChild(saveConfirmation);
                    
                    // Remove after 2 seconds
                    setTimeout(() => {
                        saveConfirmation.remove();
                    }, 2000);
                }
            });
        };
        
        // Add change event listeners
        genderPreference.addEventListener('change', saveVoicePreferences);
        typePreference.addEventListener('change', saveVoicePreferences);
    }
    
    // Initialize cache statistics display
    function updateCacheStats(): void {
        chrome.storage.local.get(['ttsCacheStats'], (result) => {
            if (result.ttsCacheStats) {
                const stats = result.ttsCacheStats;
                const cacheHits = document.getElementById('cacheHits');
                const cacheMisses = document.getElementById('cacheMisses');
                const cacheSize = document.getElementById('cacheSize');
                
                if (cacheHits) cacheHits.textContent = `Hits: ${stats.hits}`;
                if (cacheMisses) cacheMisses.textContent = `Misses: ${stats.misses}`;
                if (cacheSize) cacheSize.textContent = `Items: ${stats.size}`;
            }
        });
    }
    
    // Update cache stats when popup opens
    updateCacheStats();
    
    // Handle cache clear button
    const clearCacheButton = document.getElementById('clearCache');
    if (clearCacheButton) {
        clearCacheButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'clearCache' }, () => {
                // Update cache stats display after clearing
                updateCacheStats();
                // Show feedback
                const cacheStats = document.querySelector('.cache-stats');
                if (cacheStats) {
                    const feedback = document.createElement('div');
                    feedback.className = 'success-message';
                    feedback.textContent = 'Cache cleared successfully';
                    cacheStats.appendChild(feedback);
                    setTimeout(() => feedback.remove(), 3000);
                }
            });
        });
    }
    
    // Listen for cache stats updates
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'cacheStatsUpdated') {
            updateCacheStats();
        }
        return true;
    });

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
                validateAndFetchVoices(apiKey);
            });
        } else {
            apiKeyStatus.textContent = 'Please enter a valid API key.';
            apiKeyStatus.className = 'error-message';
        }
    });

    // Add event listener for diagnostics link
    const diagnosticsLink = document.getElementById('openDiagnostics');
    if (diagnosticsLink) {
        diagnosticsLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Open the diagnostics page in a new tab
            chrome.runtime.openOptionsPage();
        });
    }

    // Set up the read text buttons and playback control
    readSelectedBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        return window.getSelection()?.toString() || '';
                    }
                }, (result) => {
                    if (result && result[0]?.result) {
                        const selectedText = result[0].result as string;
                        if (selectedText) {
                            chrome.runtime.sendMessage({
                                action: "readText",
                                text: selectedText,
                                voice: voiceSelect.value,
                                speed: Number(speedRange.value)
                            });
                        } else {
                            apiKeyStatus.textContent = 'No text selected.';
                            apiKeyStatus.className = 'error-message';
                        }
                    }
                });
            }
        });
    });

    readPageBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        return document.body.innerText;
                    }
                }, (result) => {
                    if (result && result[0]?.result) {
                        const pageText = result[0].result as string;
                        if (pageText) {
                            chrome.runtime.sendMessage({
                                action: "readText",
                                text: pageText,
                                voice: voiceSelect.value,
                                speed: Number(speedRange.value)
                            });
                        }
                    }
                });
            }
        });
    });

    pauseBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "pauseReading" });
    });

    resumeBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "resumeReading" });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "stopReading" });
    });

    nextBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "nextChunk" });
    });

    previousBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "previousChunk" });
    });

    // Listen for API key validation messages
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'apiKeyValid') {
            if (apiKeyStatus) {
                apiKeyStatus.textContent = 'API key is valid ✓';
                apiKeyStatus.style.color = 'green';
            }
        } else if (message.action === 'apiKeyInvalid') {
            if (apiKeyStatus) {
                apiKeyStatus.textContent = message.error || 'API key is invalid';
                apiKeyStatus.style.color = 'red';
            }
        } else if (message.action === 'ttsError') {
            if (apiKeyStatus) {
                apiKeyStatus.textContent = message.error || 'TTS Error occurred';
                apiKeyStatus.style.color = 'red';
            }
        }
        return true;
    });
});
