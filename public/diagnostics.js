// diagnostics.js - Script for TTS Diagnostics page
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKey');
    const checkApiKeyButton = document.getElementById('checkApiKey');
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const apiKeyLoading = document.getElementById('apiKeyLoading');
    
    const audioSupportStatus = document.getElementById('audioSupportStatus');
    const audioSupportLoading = document.getElementById('audioSupportLoading');
    
    const synthesisStatus = document.getElementById('synthesisStatus');
    const voiceSelect = document.getElementById('voiceSelect');
    const testSynthesisButton = document.getElementById('testSynthesis');
    const sampleAudio = document.getElementById('sampleAudio');
    
    const connectionStatus = document.getElementById('connectionStatus');
    const testConnectionButton = document.getElementById('testConnection');
    
    const systemInfoDetails = document.getElementById('systemInfoDetails');
    
    const runAllTestsButton = document.getElementById('runAllTests');
    const copyResultsButton = document.getElementById('copyResults');
    const viewLogsButton = document.getElementById('viewLogs');
    
    const logs = document.getElementById('logs');
    const logContent = document.getElementById('logContent');
    
    // Utility functions
    const formatMessage = (status, message) => {
        return `<div class="${status}">
            <strong>${status === 'success' ? '✓' : status === 'warning' ? '⚠' : '✗'}</strong> ${message}
        </div>`;
    };
    
    const log = (message, type = 'info') => {
        const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        logContent.appendChild(logEntry);
        console.log(`[${type}] ${message}`);
    };
    
    // Check browser audio support and playback test
    const checkAudioSupport = () => {
        try {
            audioSupportLoading.style.display = 'inline-block';
            
            const audio = new Audio();
            const mp3Support = audio.canPlayType('audio/mp3');
            const audioAPI = typeof HTMLAudioElement !== 'undefined';
            
            if (mp3Support && audioAPI) {
                audioSupportStatus.innerHTML = formatMessage('success', 'Your browser supports MP3 audio playback required for TTS');
                log('Audio support check passed: Browser supports MP3 and Audio API');
                return true;
            } else {
                let errorMessage = 'Browser audio support issues detected:';
                if (!mp3Support) errorMessage += ' MP3 format not supported.';
                if (!audioAPI) errorMessage += ' HTML Audio API not supported.';
                
                audioSupportStatus.innerHTML = formatMessage('error', errorMessage);
                log(`Audio support check failed: ${errorMessage}`, 'error');
                return false;
            }
        } catch (error) {
            audioSupportStatus.innerHTML = formatMessage('error', `Error checking audio support: ${error.message}`);
            log(`Error during audio support check: ${error.message}`, 'error');
            return false;
        } finally {
            audioSupportLoading.style.display = 'none';
        }
    };

    // Test audio playback with a test tone
    const testAudioPlayback = () => {
        // Get the container to place the audio
        const testAudioContainer = document.getElementById('testAudioContainer');
        if (!testAudioContainer) {
            log('Audio playback test failed: Container not found', 'error');
            return false;
        }
        
        // Clear previous content
        testAudioContainer.innerHTML = '';
        
        // Create a "Loading..." message
        const loadingMsg = document.createElement('div');
        loadingMsg.textContent = 'Generating test audio...';
        testAudioContainer.appendChild(loadingMsg);
        
        try {
            // Generate a test tone (1 second, 440 Hz sine wave)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioContext.sampleRate;
            const duration = 1; // seconds
            const numSamples = duration * sampleRate;
            const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
            const data = buffer.getChannelData(0);
            
            // Fill the buffer with a simple sine wave
            const frequency = 440; // A4 note
            for (let i = 0; i < numSamples; i++) {
                data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
            }
            
            // Convert to WAV
            const wavBuffer = audioBufferToWav(buffer);
            
            // Convert to base64
            const base64Data = arrayBufferToBase64(wavBuffer);
            
            // Remove loading message
            testAudioContainer.innerHTML = '';
            
            // Create audio element
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = `data:audio/wav;base64,${base64Data}`;
            
            // Add status message and audio element
            const statusDiv = document.createElement('div');
            statusDiv.className = 'success';
            statusDiv.innerHTML = '<strong>✓</strong> Test audio generated successfully. Press play to test.';
            
            testAudioContainer.appendChild(statusDiv);
            testAudioContainer.appendChild(audio);
            
            log('Audio playback test: Test tone generated successfully', 'success');
            return true;
        } catch (error) {
            testAudioContainer.innerHTML = formatMessage('error', `Failed to generate test audio: ${error.message}`);
            log(`Audio playback test failed: ${error.message}`, 'error');
            return false;
        }
    };

    // Convert AudioBuffer to WAV format
    function audioBufferToWav(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const numSamples = buffer.length;
        const bytesPerSample = 2; // 16-bit
        
        const dataSize = numChannels * numSamples * bytesPerSample;
        const headerSize = 44;
        const wavBuffer = new ArrayBuffer(headerSize + dataSize);
        const view = new DataView(wavBuffer);
        
        // Write WAV header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // Byte rate
        view.setUint16(32, numChannels * bytesPerSample, true); // Block align
        view.setUint16(34, 8 * bytesPerSample, true); // Bits per sample
        writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);
        
        // Write audio data
        const channelData = [];
        for (let c = 0; c < numChannels; c++) {
            channelData.push(buffer.getChannelData(c));
        }
        
        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
            for (let c = 0; c < numChannels; c++) {
                const sample = Math.max(-1, Math.min(1, channelData[c][i]));
                const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, int16, true);
                offset += bytesPerSample;
            }
        }
        
        return wavBuffer;
    }

    // Helper to write string to DataView
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // Convert ArrayBuffer to base64
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    // Validate API key
    const validateApiKey = async (apiKey) => {
        if (!apiKey) {
            apiKeyStatus.innerHTML = formatMessage('error', 'No API key provided');
            log('API key validation failed: No key provided', 'error');
            return false;
        }
        
        // Basic format validation
        if (!/^[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
            apiKeyStatus.innerHTML = formatMessage('error', 'API key format appears invalid (keys are usually 40+ characters)');
            log('API key validation failed: Invalid format', 'error');
            return false;
        }
        
        apiKeyLoading.style.display = 'inline-block';
        apiKeyStatus.innerHTML = 'Validating API key...';
        
        try {
            log(`Testing API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`);
            const url = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                let errorMessage = '';
                
                if (response.status === 403) {
                    errorMessage = 'API key rejected (403 Forbidden). The key may be invalid or the TTS API isn\'t enabled.';
                } else if (response.status === 404) {
                    errorMessage = 'API endpoint not found (404). The Google TTS API URL may have changed.';
                } else if (response.status === 429) {
                    errorMessage = 'API quota exceeded (429). You\'ve reached your Google Cloud TTS usage limit.';
                } else {
                    errorMessage = `API error (${response.status}): ${response.statusText}`;
                }
                
                apiKeyStatus.innerHTML = formatMessage('error', errorMessage);
                log(`API key validation failed: ${errorMessage}`, 'error');
                return false;
            }
            
            const data = await response.json();
            
            if (!data.voices || !Array.isArray(data.voices) || data.voices.length === 0) {
                apiKeyStatus.innerHTML = formatMessage('warning', 'API key is valid but no voices were returned');
                log('API key validation warning: No voices returned', 'warning');
                return false;
            }
            
            apiKeyStatus.innerHTML = formatMessage('success', `API key is valid! (${data.voices.length} voices available)`);
            log(`API key validation successful: ${data.voices.length} voices available`, 'success');
            
            // Populate voice dropdown
            populateVoices(data.voices);
            return true;
            
        } catch (error) {
            apiKeyStatus.innerHTML = formatMessage('error', `Error connecting to Google TTS API: ${error.message}`);
            log(`API key validation error: ${error.message}`, 'error');
            return false;
        } finally {
            apiKeyLoading.style.display = 'none';
        }
    };
    
    // Populate voice dropdown
    const populateVoices = (voices) => {
        voiceSelect.innerHTML = '';
        
        if (!voices || voices.length === 0) {
            voiceSelect.innerHTML = '<option value="">No voices available</option>';
            return;
        }
        
        // Sort voices by language
        voices.sort((a, b) => {
            const langA = a.languageCodes[0];
            const langB = b.languageCodes[0];
            return langA.localeCompare(langB);
        });
        
        // Group voices by language
        const languageGroups = {};
        
        voices.forEach(voice => {
            const langCode = voice.languageCodes[0];
            if (!languageGroups[langCode]) {
                languageGroups[langCode] = [];
            }
            languageGroups[langCode].push(voice);
        });
        
        // Create option groups for each language
        Object.keys(languageGroups).forEach(langCode => {
            const voicesInLang = languageGroups[langCode];
            const group = document.createElement('optgroup');
            group.label = `${langCode} (${voicesInLang.length} voices)`;
            
            voicesInLang.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice.name;
                option.textContent = `${voice.name} (${voice.ssmlGender})`;
                group.appendChild(option);
            });
            
            voiceSelect.appendChild(group);
        });
        
        // Enable test synthesis button
        testSynthesisButton.disabled = false;
    };
    
    // Test TTS synthesis
    const testTTSSynthesis = async () => {
        const apiKey = apiKeyInput.value.trim();
        const voice = voiceSelect.value;
        
        if (!apiKey) {
            synthesisStatus.innerHTML = formatMessage('error', 'API key required for synthesis test');
            log('Synthesis test failed: No API key provided', 'error');
            return;
        }
        
        if (!voice) {
            synthesisStatus.innerHTML = formatMessage('error', 'Voice selection required for synthesis test');
            log('Synthesis test failed: No voice selected', 'error');
            return;
        }
        
        synthesisStatus.innerHTML = 'Testing synthesis...';
        testSynthesisButton.disabled = true;
        sampleAudio.innerHTML = '';
        
        try {
            const testText = "This is a test of the Text-to-Speech API. If you can hear this message, the API is working correctly.";
            const apiUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
            
            log(`Testing synthesis with voice: ${voice}`);
            
            const requestData = {
                input: { text: testText },
                voice: { languageCode: voice.split('-')[0], name: voice },
                audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 }
            };
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                let errorMessage = '';
                
                try {
                    const errorData = await response.json();
                    errorMessage = `Google TTS API error: ${errorData.error?.message || response.statusText}`;
                } catch {
                    errorMessage = `HTTP error: ${response.status} ${response.statusText}`;
                }
                
                synthesisStatus.innerHTML = formatMessage('error', errorMessage);
                log(`Synthesis test failed: ${errorMessage}`, 'error');
                return;
            }
            
            const data = await response.json();
            
            if (!data.audioContent) {
                synthesisStatus.innerHTML = formatMessage('error', 'No audio content received from Google TTS API');
                log('Synthesis test failed: No audio content in response', 'error');
                return;
            }
            
            log('Audio content received successfully');
            
            // Create audio element for playback
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.src = `data:audio/mp3;base64,${data.audioContent}`;
            
            // Error handler
            audioElement.onerror = (error) => {
                log(`Audio playback error: ${error}`, 'error');
                synthesisStatus.innerHTML = formatMessage('error', 'Audio playback failed. The synthesis worked but the audio cannot be played.');
            };
            
            // Success handler
            audioElement.onloadeddata = () => {
                log('Audio loaded successfully');
                synthesisStatus.innerHTML = formatMessage('success', 'Synthesis successful! You can play the audio below.');
            };
            
            sampleAudio.appendChild(audioElement);
            
        } catch (error) {
            synthesisStatus.innerHTML = formatMessage('error', `Error during synthesis test: ${error.message}`);
            log(`Synthesis test error: ${error.message}`, 'error');
        } finally {
            testSynthesisButton.disabled = false;
        }
    };
    
    // Test connection to Google TTS API
    const testConnection = async () => {
        connectionStatus.innerHTML = 'Testing connection...';
        
        try {
            log('Testing connection to Google TTS API endpoint');
            
            const response = await fetch('https://texttospeech.googleapis.com/v1', {
                method: 'HEAD'
            });
            
            if (response.ok || response.status === 403) {
                // 403 means the server is reachable but authentication is required,
                // which is actually a good sign for connectivity tests
                connectionStatus.innerHTML = formatMessage('success', 'Connection to Google TTS API endpoint successful');
                log('Connection test passed', 'success');
            } else {
                connectionStatus.innerHTML = formatMessage('error', `Connection error: ${response.status} ${response.statusText}`);
                log(`Connection test failed: ${response.status} ${response.statusText}`, 'error');
            }
        } catch (error) {
            connectionStatus.innerHTML = formatMessage('error', `Connection error: ${error.message}`);
            log(`Connection test failed: ${error.message}`, 'error');
        }
    };
    
    // Get system information
    const collectSystemInfo = () => {
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            language: navigator.language,
            doNotTrack: navigator.doNotTrack,
            hardwareConcurrency: navigator.hardwareConcurrency,
            screenSize: `${window.screen.width}×${window.screen.height}`,
            colorDepth: window.screen.colorDepth,
            audioFormats: {
                mp3: new Audio().canPlayType('audio/mp3'),
                ogg: new Audio().canPlayType('audio/ogg'),
                wav: new Audio().canPlayType('audio/wav'),
                aac: new Audio().canPlayType('audio/aac')
            }
        };
        
        systemInfoDetails.textContent = JSON.stringify(info, null, 2);
        log('System information collected');
    };
    
    // Run all tests
    const runAllTests = async () => {
        log('==== Starting diagnostics: Running all tests ====');
        
        // Step 1: Check audio support
        const audioSupported = checkAudioSupport();
        
        // Step 2: Validate API key
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            apiKeyStatus.innerHTML = formatMessage('error', 'Please enter your API key to run all tests');
            return;
        }
        
        const apiValid = await validateApiKey(apiKey);
        
        // Step 3: Test connection
        await testConnection();
        
        // Step 4: Run synthesis test if we have a valid API key and voice
        if (apiValid && voiceSelect.value) {
            await testTTSSynthesis();
        }
        
        log('==== Diagnostics complete ====');
    };
    
    // Copy diagnostic results to clipboard
    const copyResults = () => {
        try {
            const results = {
                apiKeyStatus: apiKeyStatus.textContent.trim(),
                audioSupportStatus: audioSupportStatus.textContent.trim(),
                synthesisStatus: synthesisStatus.textContent.trim(),
                connectionStatus: connectionStatus.textContent.trim(),
                systemInfo: JSON.parse(systemInfoDetails.textContent),
                logs: Array.from(logContent.childNodes).map(node => node.textContent)
            };
            
            const resultsText = JSON.stringify(results, null, 2);
            navigator.clipboard.writeText(resultsText);
            
            alert('Diagnostic results copied to clipboard!');
        } catch (error) {
            alert(`Failed to copy results: ${error.message}`);
        }
    };
    
    // Toggle log visibility
    const toggleLogs = () => {
        if (logs.style.display === 'none') {
            logs.style.display = 'block';
            viewLogsButton.textContent = 'Hide Logs';
        } else {
            logs.style.display = 'none';
            viewLogsButton.textContent = 'View Logs';
        }
    };
    
    // Load API key from storage
    const loadApiKey = () => {
        chrome.storage.local.get(['googleApiKey'], (result) => {
            if (result.googleApiKey) {
                apiKeyInput.value = result.googleApiKey;
                log('API key loaded from storage');
            } else {
                log('No API key found in storage', 'warning');
            }
        });
    };
    
    // Initialize
    const init = () => {
        // Load API key from storage
        loadApiKey();
        
        // Set up event listeners
        document.addEventListener('DOMContentLoaded', () => {
            // Run checks that don't require user input
            checkAudioSupport();
            collectSystemInfo();
            
            // Try to load API key from storage
            chrome.storage.local.get(['googleApiKey'], (result) => {
                if (result.googleApiKey) {
                    apiKeyInput.value = result.googleApiKey;
                    log('API key loaded from storage');
                    validateApiKey(result.googleApiKey)
                        .then(isValid => {
                            if (isValid) {
                                populateVoices(result.googleApiKey);
                            }
                        });
                }
            });
            
            // Set up UI event listeners
            checkApiKeyButton.addEventListener('click', () => {
                const apiKey = apiKeyInput.value.trim();
                validateApiKey(apiKey)
                    .then(isValid => {
                        if (isValid) {
                            populateVoices(apiKey);
                            chrome.storage.local.set({ googleApiKey: apiKey });
                            log('API key saved to storage');
                        }
                    });
            });
            
            // Add event listener for audio test button
            const testAudioSupportButton = document.getElementById('testAudioSupport');
            if (testAudioSupportButton) {
                testAudioSupportButton.addEventListener('click', () => {
                    log('Running audio playback test');
                    testAudioPlayback();
                });
            }
            
            testSynthesisButton.addEventListener('click', testTTSSynthesis);
            testConnectionButton.addEventListener('click', testConnection);
            runAllTestsButton.addEventListener('click', runAllTests);
            copyResultsButton.addEventListener('click', copyResults);
            
            viewLogsButton.addEventListener('click', () => {
                if (logs.style.display === 'none') {
                    logs.style.display = 'block';
                    viewLogsButton.textContent = 'Hide Logs';
                } else {
                    logs.style.display = 'none';
                    viewLogsButton.textContent = 'View Logs';
                }
            });
        });
        
        // Run initial tests
        checkAudioSupport();
        collectSystemInfo();
        testConnection();
        
        log('Diagnostics page initialized');
    };
    
    // Start initialization
    init();
});
