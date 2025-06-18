// Enhanced TypeScript version of background.js
/// <reference types="chrome" />
import { PlaybackSettings } from './settings';
import { HighlightOptions } from './highlight';
import { 
  initPerformanceOptimizations, 
  retryWithBackoff,
  DEFAULT_PERFORMANCE_CONFIG,
  PerformanceConfig
} from './performance_optimization';
import { applyPronunciationDictionary } from './pronunciation_dictionary';
import { detectLanguage } from './language_detection';
import { audioCache } from './audio_cache';
import { 
  detectLanguage as enhancedDetectLanguage,
  findBestVoiceForLanguage, 
  setAvailableVoices,
  autoSelectVoice 
} from './enhanced_language_detection';

// Helper function to handle errors from chrome.runtime.sendMessage
function handleSendMessageError(error: any, action: string) {
    if (error.message && error.message.includes("Could not establish connection. Receiving end does not exist.")) {
        console.log(`Failed to send runtime message for action '${action}': Receiving end does not exist (e.g., popup closed or no active listener).`);
    } else {
        console.error(`Failed to send runtime message for action '${action}':`, error);
    }
}

// Helper function to handle errors from chrome.tabs.sendMessage
function handleTabSendMessageError(error: any, tabId: number | undefined, action: string) {
    if (tabId === undefined) {
        console.warn(`Attempted to send tab message for action '${action}' but tabId was undefined.`);
        return;
    }
    if (error.message && error.message.includes("Could not establish connection. Receiving end does not exist.")) {
        console.log(`Failed to send tab message for action '${action}' to tab ${tabId}: Content script not listening or not injected.`);
    } else {
        console.error(`Failed to send tab message for action '${action}' to tab ${tabId}:`, error);
    }
}

// Update `sendMessageIfListenerActive` to handle asynchronous responses properly.
function sendMessageIfListenerActive(message: any, action: string): void {
    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            console.warn(`Error sending message for action '${action}':`, chrome.runtime.lastError.message);
        } else if (!response) {
            console.warn(`No response received for action '${action}'.`);
        } else {
            console.log(`Message for action '${action}' sent successfully. Response:`, response);
        }
    });
}

interface TTSRequest {
  text: string;
  voice: string;
  languageCode?: string;
  speed: number;
}

interface TTSResponse {
  audioContent: string;  // Base64 encoded audio
}

interface AudioChunk {
  audio: HTMLAudioElement;
  text: string;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
  lastProgressUpdate?: number;
}

interface MessageRequest {
  action: string;
  text?: string;
  voice?: string;
  speed?: number;
  newKey?: string;
  settings?: Partial<PlaybackSettings>;
  highlightOptions?: HighlightOptions;
  chunkIndex?: number;
  voices?: Array<{name: string; languageCode: string; gender: string; type: string}>;
}

let currentAudio: HTMLAudioElement | null = null;
let userApiKey: string = '';
const MAX_TTS_BYTES: number = 4800;
let audioQueue: AudioChunk[] = [];
let isPlayingQueue: boolean = false;
let currentChunkIndex: number = 0;
let totalDuration: number = 0;
let currentTime: number = 0;
let playbackSettings: PlaybackSettings = {
    speed: 1,
    highlightType: 'word',
    enableHighlight: true
};

// Initialize performance optimizations
initPerformanceOptimizations(DEFAULT_PERFORMANCE_CONFIG);

// Initialize performanceConfig
let performanceConfig: PerformanceConfig = DEFAULT_PERFORMANCE_CONFIG;

chrome.storage.local.get(['performanceConfig'], (result: { performanceConfig?: PerformanceConfig }) => {
    if (result.performanceConfig) {
        performanceConfig = { ...performanceConfig, ...result.performanceConfig };
        console.log('PerformanceConfig loaded from storage:', performanceConfig); // Debug log
    } else {
        console.warn('PerformanceConfig not found in storage. Using default configuration:', performanceConfig); // Debug log
    }
});

// Ensure playbackSettings and googleApiKey are initialized
chrome.storage.local.get(['playbackSettings', 'googleApiKey'], (result) => {
    if (result.playbackSettings) {
        playbackSettings = { ...playbackSettings, ...result.playbackSettings };
        console.log('Playback settings loaded:', playbackSettings); // Debug log
    } else {
        console.warn('Playback settings not found. Using defaults:', playbackSettings); // Debug log
    }

    if (result.googleApiKey) {
        userApiKey = result.googleApiKey;
        console.log('Google API key loaded:', userApiKey); // Debug log
        
        // Perform a silent API test with a minimal request to validate the API key
        if (userApiKey) {
            setTimeout(() => {
                validateApiKey(userApiKey).then(isValid => {
                    console.log('API key validation result:', isValid);
                });
            }, 1000);
        }
    } else {
        console.warn('Google API key not found. Please set it in the extension settings.'); // Debug log
    }
});

// Add null checks for performanceConfig
if (typeof performanceConfig === 'undefined') {
    console.warn('PerformanceConfig is undefined. Using default configuration.');
    performanceConfig = DEFAULT_PERFORMANCE_CONFIG;
} else {
    console.log('PerformanceConfig loaded:', performanceConfig); // Debug log
}

// Validate the API key with a small test request
async function validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey) return false;
    
    try {
        const testUrl = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;
        console.log('Sending test request to validate API key');
        
        const response = await fetch(testUrl);
        const isValid = response.ok;
        
        if (!isValid) {
            console.error('API key validation failed:', response.status, response.statusText);
            sendMessageIfListenerActive({ 
                action: 'apiKeyInvalid', 
                error: `API key validation failed: ${response.status} ${response.statusText}`
            }, 'apiKeyInvalid');
        } else {
            console.log('API key is valid');
            sendMessageIfListenerActive({ action: 'apiKeyValid' }, 'apiKeyValid');
        }
        
        return isValid;
    } catch (error) {
        console.error('Error validating API key:', error);
        sendMessageIfListenerActive({ 
            action: 'apiKeyInvalid', 
            error: 'Error validating API key. Check your network connection.'
        }, 'apiKeyInvalid');
        return false;
    }
}

// Split text into chunks for TTS processing
function splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    
    let currentChunk = "";
    
    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > MAX_TTS_BYTES) {
            if (currentChunk) chunks.push(currentChunk);
            
            if (sentence.length > MAX_TTS_BYTES) {
                const words = sentence.split(/\s+/);
                currentChunk = "";
                
                for (const word of words) {
                    if (currentChunk.length + word.length + 1 > MAX_TTS_BYTES) {
                        chunks.push(currentChunk);
                        currentChunk = word;
                    } else {
                        currentChunk += (currentChunk ? " " : "") + word;
                    }
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += (currentChunk ? " " : "") + sentence;
        }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

// Add detailed logging to `callGoogleTTSAPI` for debugging API responses.
async function callGoogleTTSAPI(text: string, voice: string, speed: number): Promise<TTSResponse> {
    console.log('Preparing TTS processing for:', { text: text.substring(0, 30) + (text.length > 30 ? '...' : ''), voice, speed }); // Debug log

    if (!userApiKey) {
        const errorMsg = 'No Google Cloud API key provided. Please set it in the extension settings.';
        console.error(errorMsg);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: errorMsg
        }, 'ttsError');
        throw new Error(errorMsg);
    }

    if (!text) {
        const errorMsg = 'No text provided for TTS conversion';
        console.error(errorMsg);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: errorMsg
        }, 'ttsError');
        throw new Error(errorMsg);
    }

    if (!voice) {
        const errorMsg = 'No voice selected for TTS conversion';
        console.error(errorMsg);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: errorMsg
        }, 'ttsError');
        throw new Error(errorMsg);
    }

    console.log('Cache miss - sending request to Google TTS API');

    const apiUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + userApiKey;
    const languageCode = voice.includes('-') ? voice.split('-').slice(0, 2).join('-') : 'en-US';
    console.log(`Using language code: ${languageCode}`); // Debug log

    const requestData = {
        input: { text },
        voice: { languageCode: languageCode, name: voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: speed }
    };

    console.log('Request data:', JSON.stringify(requestData, null, 2)); // Debug log

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        console.log('Response received:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google TTS API error details:', errorData);
            throw new Error(`Google TTS API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Google TTS API response received successfully:', data);

        if (!data || typeof data.audioContent !== 'string') {
            throw new Error('Invalid TTS API response: Missing or invalid audioContent');
        }

        return data;
    } catch (error: any) {
        console.error('Error during Google TTS API request:', error);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: error.message || 'Unknown error during TTS API request'
        }, 'ttsError');
        throw error;
    }
}

// Replace `document.createElement('audio')` with the `Audio` constructor in `createAudioElement`.
function createAudioElement(src: string): HTMLAudioElement {
    if (typeof Audio === 'undefined') {
        console.error('Audio is not defined. Ensure this code runs in a browser environment.');
        throw new ReferenceError('Audio is not defined.');
    }
    const audio = new Audio(src);
    return audio;
}

// Fixing `createAudioFromResponse` to ensure the `Audio` constructor is used correctly.
function createAudioFromResponse(ttsResponse: TTSResponse): HTMLAudioElement {
    try {
        if (!ttsResponse || !ttsResponse.audioContent) {
            throw new Error('Invalid TTS response: Missing audio content');
        }

        const audioSrc = `data:audio/mp3;base64,${ttsResponse.audioContent}`;
        const audio = createAudioElement(audioSrc);
        setupAudioEventHandlers(audio);
        return audio;
    } catch (error: any) {
        console.error('Error creating audio from TTS response:', error);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: `Failed to create audio: ${error.message}`
        }, 'ttsError');

        const dummyAudio = createAudioElement('');
        setupAudioEventHandlers(dummyAudio);

        setTimeout(() => {
            const errorEvent = new ErrorEvent('error', { 
                message: `Failed to create audio: ${error.message}`,
                error: error
            });
            dummyAudio.dispatchEvent(errorEvent);
        }, 0);

        return dummyAudio;
    }
}

// Helper function to set up audio element with URL cleanup
function setupAudioWithCleanup(audio: HTMLAudioElement, url: string): HTMLAudioElement {
    setupAudioEventHandlers(audio);
    
    audio.addEventListener('loadeddata', () => {
        console.log('Audio loaded successfully. Duration:', audio.duration);
        
        const originalOnEnded = audio.onended;
        audio.onended = (event) => {
            URL.revokeObjectURL(url);
            console.log('Blob URL cleaned up');
            
            if (originalOnEnded && typeof originalOnEnded === 'function') {
                originalOnEnded.call(audio, event);
            }
        };
    });
    
    return audio;
}

// Helper function to set up common audio element event handlers
function setupAudioEventHandlers(audio: HTMLAudioElement): void {
    audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        
        if (audio.error) {
            console.error('Audio element error code:', audio.error.code);
            console.error('Audio element error message:', audio.error.message);
            
            let errorMessage = 'Unknown audio error';
            
            switch (audio.error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    errorMessage = 'Audio playback aborted by the user';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    errorMessage = 'Network error during audio loading';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    errorMessage = 'Audio decoding error - the audio data may be corrupted';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Audio format not supported by your browser';
                    break;
            }
            
            sendMessageIfListenerActive({ 
                action: 'ttsError', 
                error: `Audio error: ${errorMessage}`
            }, 'ttsError');
        } else {
            sendMessageIfListenerActive({ 
                action: 'ttsError', 
                error: 'Unknown audio error occurred'
            }, 'ttsError');
        }
    });
    
    audio.addEventListener('loadstart', () => console.log('Audio loading started'));
    audio.addEventListener('canplay', () => console.log('Audio can now begin playback'));
    audio.addEventListener('canplaythrough', () => console.log('Audio can play through without buffering'));
    audio.addEventListener('durationchange', () => console.log('Audio duration changed to:', audio.duration));
    audio.addEventListener('play', () => console.log('Audio playback started'));
    audio.addEventListener('pause', () => console.log('Audio playback paused'));
    audio.addEventListener('ended', () => console.log('Audio playback ended'));
}

// Enhanced synthesize and play functionality with better error handling
async function synthesizeAndPlay(text: string, voice: string, speed: number, autoDetectLanguage: boolean = false): Promise<void> {
    console.log('Starting synthesis and playback with:', { text, voice, speed, autoDetectLanguage }); // Debug log

    if (!text) {
        const errorMsg = 'Missing text for synthesis';
        console.error(errorMsg);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: errorMsg
        }, 'ttsError');
        return;
    }
    
    if (!voice && !autoDetectLanguage) {
        const errorMsg = 'No voice selected';
        console.error(errorMsg);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: errorMsg
        }, 'ttsError');
        return;
    }
    
    if (!userApiKey) {
        const errorMsg = 'No API key provided. Please set your Google Cloud API key in the extension settings.';
        console.error(errorMsg);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: errorMsg
        }, 'ttsError');
        return;
    }

    try {
        if (autoDetectLanguage) {
            sendMessageIfListenerActive({ 
                action: 'ttsInfo', 
                info: 'Detecting language...'
            }, 'ttsInfo');
            
            const preferences = await new Promise<{gender?: 'MALE' | 'FEMALE' | 'NEUTRAL', voiceType?: string}>(resolve => {
                chrome.storage.local.get(['voicePreferences'], (result) => {
                    resolve(result.voicePreferences || {});
                });
            });
            
            const result = await autoSelectVoice(text, {
                gender: preferences.gender as any,
                voiceType: preferences.voiceType as any
            });
            
            if (result.voice) {
                voice = result.voice;
                sendMessageIfListenerActive({ 
                    action: 'ttsInfo', 
                    info: `Detected language: ${result.detectedLanguage} (${Math.round(result.confidence * 100)}% confidence)`
                }, 'ttsInfo');
                
                if (result.fallbackUsed) {
                    sendMessageIfListenerActive({ 
                        action: 'ttsWarning', 
                        warning: `No voice available for detected language. Using ${voice} instead.`
                    }, 'ttsWarning');
                }
            } else {
                sendMessageIfListenerActive({ 
                    action: 'ttsWarning', 
                    warning: 'Could not detect language or find appropriate voice. Using default voice.'
                }, 'ttsWarning');
                
                if (!voice) {
                    voice = 'en-US-Neural2-A';
                }
            }
        }

        stopPlayback();
        
        audioQueue = [];
        currentChunkIndex = 0;
        totalDuration = 0;
        currentTime = 0;
        isPlayingQueue = true;
        
        console.log('Testing API key validity before full synthesis...');
        
        const testText = text.length > 100 ? text.substring(0, 50) : text;
        
        try {
            const ttsResponse = await callGoogleTTSAPI(testText, voice, speed);
            console.log('API key valid, response received for test text');
            
            if (!ttsResponse.audioContent) {
                const errorMsg = 'No audio content received from Google TTS API.';
                console.error(errorMsg);
                sendMessageIfListenerActive({ 
                    action: 'ttsError', 
                    error: errorMsg
                }, 'ttsError');
                return;
            }
        } catch (apiError: any) {
            return;
        }
        
        const textChunks = splitTextIntoChunks(text);
        console.log(`Text split into ${textChunks.length} chunks for processing`);
        
        if (textChunks.length === 0) {
            sendMessageIfListenerActive({ 
                action: 'ttsError', 
                error: 'No valid text chunks to process'
            }, 'ttsError');
            return;
        }
        
        if (playbackSettings.enableHighlight) {
            await injectHighlightContentScript();
        }
        
        for (let i = 0; i < textChunks.length; i++) {
            try {
                const chunk = textChunks[i];
                
                sendMessageIfListenerActive({
                    action: 'ttsProgress',
                    currentChunk: i + 1,
                    totalChunks: textChunks.length,
                    text: chunk.substring(0, 30) + (chunk.length > 30 ? '...' : '')
                }, 'ttsProgress');
                
                const ttsResponse = await callGoogleTTSAPI(chunk, voice, speed);
                const audio = createAudioFromResponse(ttsResponse);
                
                await new Promise<void>((resolve) => {
                    if (audio.duration && !isNaN(audio.duration)) {
                        resolve();
                        return;
                    }
                    
                    const timeout = setTimeout(() => {
                        console.warn('Audio duration loading timed out, using estimate');
                        resolve();
                    }, 3000);
                    
                    audio.addEventListener('loadedmetadata', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                    
                    audio.addEventListener('error', () => {
                        clearTimeout(timeout);
                        console.error('Error loading audio metadata');
                        resolve();
                    });
                });
                
                const audioDuration = audio.duration || (chunk.split(/\s+/).length * 0.3 / speed);
                
                audioQueue.push({
                    audio,
                    text: chunk,
                    startTime: totalDuration,
                    endTime: totalDuration + audioDuration,
                    isPlaying: false
                });
                
                totalDuration += audioDuration;
                
            } catch (chunkError: any) {
                console.error(`Error processing chunk ${i+1}:`, chunkError);
            }
        }
        
        if (audioQueue.length > 0) {
            console.log(`Starting playback of ${audioQueue.length} audio chunks`);
            startPlayback();
        } else {
            console.error('No audio chunks were generated');
            sendMessageIfListenerActive({ 
                action: 'ttsError', 
                error: 'Failed to generate any audio chunks. Please try again with different text or settings.'
            }, 'ttsError');
        }
    } catch (error: any) {
        console.error('Error during synthesis and playback:', error);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: error.message || 'Unknown error during synthesis'
        }, 'ttsError');
    }
}

// Fixing `injectHighlightContentScript` to ensure proper error handling and script injection.
async function injectHighlightContentScript(): Promise<void> {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
            await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['src/tts_highlight_content.js'] // Updated file path
            });
            console.log('Highlight content script injected successfully.');
        } else {
            throw new Error('No active tab found to inject the script.');
        }
    } catch (error: any) {
        console.error('Error injecting highlight content script:', error);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: `Failed to inject highlight script: ${error.message}`
        }, 'ttsError');
    }
}

// Enhanced start playback of audio queue with better error handling
function startPlayback(): void {
    if (audioQueue.length === 0) {
        console.warn('Attempted to start playback with empty audio queue');
        sendMessageIfListenerActive({ 
            action: 'ttsWarning', 
            warning: 'No audio available to play'
        }, 'ttsWarning');
        return;
    }
    
    if (isPlayingQueue) {
        console.log('Playback already in progress, resetting to start');
    }
    
    isPlayingQueue = true;
    currentChunkIndex = 0;
    
    sendMessageIfListenerActive({ 
        action: 'playbackStarted',
        totalDuration,
        totalChunks: audioQueue.length
    }, 'playbackStarted');
    
    playCurrentChunk();
}

// Enhanced play current chunk with better error handling and retry logic
function playCurrentChunk(): void {
    if (!isPlayingQueue) {
        console.log('Playback is not active, cannot play chunk');
        return;
    }
    
    if (currentChunkIndex >= audioQueue.length) {
        console.log('Reached end of audio queue, completing playback');
        isPlayingQueue = false;
        sendMessageIfListenerActive({ action: 'playbackComplete' }, 'playbackComplete');
        
        if (playbackSettings.enableHighlight) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'clearHighlights' })
                    .catch(e => handleTabSendMessageError(e, tabs[0]?.id, 'clearHighlights'));
                }
            });
        }
        
        return;
    }
    
    const chunk = audioQueue[currentChunkIndex];
    currentAudio = chunk.audio;
    
    if (currentAudio && playbackSettings.speed > 0) {
        currentAudio.playbackRate = playbackSettings.speed;
    }
    
    if (currentAudio) {
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.ontimeupdate = null;
        
        currentAudio.onended = () => {
            console.log(`Chunk ${currentChunkIndex + 1}/${audioQueue.length} playback ended`);
            chunk.isPlaying = false;
            currentChunkIndex++;
            playCurrentChunk();
        };
        
        currentAudio.onerror = (event) => {
            console.error(`Error playing chunk ${currentChunkIndex + 1}:`, event);
            console.error('Audio error code:', currentAudio?.error?.code);
            
            sendMessageIfListenerActive({ 
                action: 'ttsWarning', 
                warning: `Error playing audio chunk ${currentChunkIndex + 1}. Trying next chunk.`
            }, 'ttsWarning');
            
            chunk.isPlaying = false;
            currentChunkIndex++;
            playCurrentChunk();
        };
        
        currentAudio.ontimeupdate = () => {
            if (!currentAudio) return;
            
            currentTime = chunk.startTime + currentAudio.currentTime;
            
            if (!chunk.lastProgressUpdate || Date.now() - chunk.lastProgressUpdate > 250) {
                sendMessageIfListenerActive({
                    action: 'playbackProgress',
                    currentTime,
                    totalDuration,
                    currentChunk: currentChunkIndex,
                    totalChunks: audioQueue.length
                }, 'playbackProgress');
                chunk.lastProgressUpdate = Date.now();
            }
            
            if (playbackSettings.enableHighlight) {
                handleTextHighlighting(chunk, currentAudio);
            }
        };
        
        chunk.isPlaying = true;
        playAudioWithRetry(currentAudio, 3)
            .catch((error) => {
                console.error('Failed to play audio after retries:', error);
                sendMessageIfListenerActive({ 
                    action: 'ttsError', 
                    error: 'Failed to play audio: ' + (error.message || 'Unknown error') 
                }, 'ttsError');
                
                currentChunkIndex++;
                playCurrentChunk();
            });
    } else {
        console.error('Current audio is null for chunk:', currentChunkIndex);
        currentChunkIndex++;
        playCurrentChunk();
    }
}

// Helper function for text highlighting during playback
function handleTextHighlighting(chunk: AudioChunk, audio: HTMLAudioElement): void {
    const chunkProgress = audio.currentTime / (audio.duration || 1);
    const chunkText = chunk.text;
    
    if (playbackSettings.highlightType === 'word') {
        const words = chunkText.split(/\s+/);
        const wordIndex = Math.min(Math.floor(chunkProgress * words.length), words.length - 1);
        const currentWord = words[wordIndex];
        
        if (currentWord) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'highlightText',
                        text: currentWord,
                        options: {
                            type: 'word',
                            enabled: true
                        }
                    }).catch(e => handleTabSendMessageError(e, tabs[0]?.id, 'highlightText'));
                }
            });
        }
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'highlightText',
                    text: chunkText,
                    options: {
                        type: 'sentence',
                        enabled: true
                    }
                }).catch(e => handleTabSendMessageError(e, tabs[0]?.id, 'highlightText'));
            }
        });
    }
}

// Helper function to play audio with retry
async function playAudioWithRetry(audio: HTMLAudioElement, maxRetries: number): Promise<void> {
    let attempt = 0;
    
    while (attempt <= maxRetries) {
        try {
            attempt++;
            console.log(`Playing audio (attempt ${attempt}/${maxRetries + 1})`);
            await audio.play();
            console.log('Audio playback started successfully');
            return;
        } catch (error: any) {
            console.error(`Error playing audio (attempt ${attempt}/${maxRetries + 1}):`, error);
            
            if (attempt <= maxRetries) {
                if (error.name === 'NotAllowedError') {
                    console.warn('Playback not allowed, might need user interaction first');
                    sendMessageIfListenerActive({ 
                        action: 'ttsWarning', 
                        warning: 'Audio playback requires user interaction. Please click the play button or refresh the page.'
                    }, 'ttsWarning');
                }
                
                const delay = Math.min(1000 * attempt, 3000);
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
    
    throw new Error('Max retry attempts reached');
}

// Pause the current playback
function pausePlayback(): void {
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        sendMessageIfListenerActive({ action: 'playbackPaused' }, 'playbackPaused');
    }
}

// Resume the current playback
function resumePlayback(): void {
    if (currentAudio && currentAudio.paused) {
        currentAudio.play().catch(error => {
            console.error('Error resuming audio:', error);
            sendMessageIfListenerActive({ action: 'ttsError', error: 'Failed to resume playback.' }, 'ttsError');
        });
        sendMessageIfListenerActive({ action: 'playbackResumed' }, 'playbackResumed');
    }
}

// Stop all playback
function stopPlayback(): void {
    isPlayingQueue = false;
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.ontimeupdate = null;
        currentAudio = null;
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'clearHighlights'
            }).catch(e => handleTabSendMessageError(e, tabs[0]?.id, 'clearHighlights'));
        }
    });
    
    audioQueue = [];
    sendMessageIfListenerActive({ action: 'playbackStopped' }, 'playbackStopped');
}

// Jump to the next chunk
function playNextChunk(): void {
    if (isPlayingQueue && currentChunkIndex < audioQueue.length - 1) {
        if (currentAudio) {
            currentAudio.pause();
        }
        
        currentChunkIndex++;
        playCurrentChunk();
    }
}

// Jump to the previous chunk
function playPreviousChunk(): void {
    if (isPlayingQueue && currentChunkIndex > 0) {
        if (currentAudio) {
            currentAudio.pause();
        }
        
        currentChunkIndex--;
        playCurrentChunk();
    }
}

// Jump to a specific chunk
function jumpToChunk(index: number): void {
    if (isPlayingQueue && index >= 0 && index < audioQueue.length) {
        if (currentAudio) {
            currentAudio.pause();
        }
        
        currentChunkIndex = index;
        playCurrentChunk();
    }
}

// Handle all incoming messages
chrome.runtime.onMessage.addListener((request: MessageRequest, sender, sendResponse) => {
    switch (request.action) {
        case "apiKeyUpdated":
            if (request.newKey) userApiKey = request.newKey;
            break;
            
        case "readText":
            if (request.text && request.voice && request.speed !== undefined) {
                synthesizeAndPlay(request.text, request.voice, request.speed);
            }
            break;
            
        case "stopReading":
            stopPlayback();
            break;
            
        case "pauseReading":
            pausePlayback();
            break;
            
        case "resumeReading":
            resumePlayback();
            break;
            
        case "nextChunk":
            playNextChunk();
            break;
            
        case "previousChunk":
            playPreviousChunk();
            break;
            
        case "jumpToChunk":
            if (request.chunkIndex !== undefined) {
                jumpToChunk(request.chunkIndex);
            }
            break;
            
        case "updateSettings":
            if (request.settings) {
                playbackSettings = { ...playbackSettings, ...request.settings };
                
                if (currentAudio && request.settings.speed) {
                    currentAudio.playbackRate = request.settings.speed;
                }
            }
            break;
            
        case "clearCache":
            audioCache.clear();
            console.log('Audio cache cleared');
            sendMessageIfListenerActive({ action: 'cacheStatsUpdated' }, 'cacheStatsUpdated');
            sendResponse({ success: true });
            break;
            
        case "setAvailableVoices":
            if (request.voices && Array.isArray(request.voices)) {
                setAvailableVoices(request.voices);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Invalid voices data' });
            }
            break;
            
        case "autoDetectLanguage":
            if (request.text) {
                if (request.text && request.speed !== undefined) {
                    synthesizeAndPlay(request.text, '', request.speed, true);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Missing required parameters' });
                }
            }
            break;
            
        case "getPlaybackState":
            sendResponse({
                isPlaying: isPlayingQueue && currentAudio && !currentAudio.paused,
                isPaused: isPlayingQueue && currentAudio && currentAudio.paused,
                currentTime,
                totalDuration,
                currentChunk: currentChunkIndex,
                totalChunks: audioQueue.length
            });
            break;
    }
    
    return true;
});

// Add listener for real-time speed control
chrome.runtime.onMessage.addListener((message: MessageRequest, sender, sendResponse) => {
    if (message.action === 'updateSpeed' && message.speed !== undefined) {
        playbackSettings.speed = message.speed;
        if (currentAudio) {
            currentAudio.playbackRate = playbackSettings.speed;
        }
        chrome.storage.local.set({ playbackSettings });
        sendResponse({ success: true });
    }
});

// Set up context menu
chrome.contextMenus.create({
    id: "readSelection",
    title: "Read Selection with TTS",
    contexts: ["selection"],
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "readSelection" && info.selectionText) {
        chrome.storage.local.get(['selectedVoice', 'playbackSettings', 'googleApiKey'], (result: {selectedVoice?: string, playbackSettings?: PlaybackSettings, googleApiKey?: string}) => {
            const voice = result.selectedVoice || 'en-US-Neural2-A';
            const speed = result.playbackSettings?.speed || 1;
            userApiKey = result.googleApiKey || '';

            if (!userApiKey) {
                console.warn('API key not found for context menu action. Please set it in options.');
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('images/icon48.svg'),
                    title: 'TTS Extension Error',
                    message: 'API key is missing. Please set it in the extension options to use Text-to-Speech.',
                    priority: 2
                }, (notificationId) => {
                    if (chrome.runtime.lastError) {
                        console.error("Notification creation failed:", chrome.runtime.lastError.message);
                    }
                });
                return;
            }
            
            if (tab?.id && info.selectionText) {
                synthesizeAndPlay(info.selectionText, voice, speed)
                    .catch(error => {
                         console.error("Error during synthesizeAndPlay from context menu:", error);
                         sendMessageIfListenerActive({ action: 'ttsError', error: `Failed to read selection: ${error.message}`}, 'ttsError');
                    });
            }
        });
    }
});

// Speak text using Google Cloud TTS API
async function speakTextWithGoogleTTS(text: string, voiceName: string, speed: number): Promise<void> {
    console.log('Preparing to send text to Google TTS API:', text); // Debug log

    if (!userApiKey) {
        console.error('API key is missing. Please set it in the extension settings.');
        return;
    }

    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + userApiKey;
    const requestBody = {
        input: { text },
        voice: { languageCode: 'en-US', name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: speed }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Google TTS API error: ${response.statusText}`);
        }

        const data = await response.json();
        const audioContent = data.audioContent;

        if (audioContent) {
            const audio = new Audio('data:audio/mp3;base64,' + audioContent);
            audio.play();
        } else {
            console.error('No audio content received from Google TTS API.');
        }
    } catch (error) {
        console.error('Error using Google TTS API:', error);
    }
}

// Update the message listener to use the Google TTS API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'speakText' && message.text) {
        speakTextWithGoogleTTS(message.text, message.voiceName || '', message.speed || 1)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// Enhance error handling for cache saving.
function saveCacheToStorage(cacheKey: string, cacheValue: any): void {
    try {
        const cacheData = { [cacheKey]: cacheValue };
        chrome.storage.local.set(cacheData, () => {
            if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
            }
            console.log('Cache saved successfully:', cacheKey);
        });
    } catch (error: any) {
        console.error('Failed to save cache to storage:', error);
        sendMessageIfListenerActive({ 
            action: 'ttsError', 
            error: `Failed to save cache: ${error.message}`
        }, 'ttsError');
    }
}
