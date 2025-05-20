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

// Split text into chunks for TTS processing
function splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    
    let currentChunk = "";
    
    for (const sentence of sentences) {
        // If adding this sentence would exceed the limit, save current chunk and start a new one
        if (currentChunk.length + sentence.length > MAX_TTS_BYTES) {
            if (currentChunk) chunks.push(currentChunk);
            
            // If a single sentence is too long, split it into words
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

// Enhanced debugging logs for callGoogleTTSAPI
async function callGoogleTTSAPI(text: string, voice: string, speed: number): Promise<TTSResponse> {
    console.log('Sending request to Google TTS API with:', { text, voice, speed }); // Debug log

    const apiUrl = 'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + userApiKey;
    const requestData = {
        input: { text },
        voice: { languageCode: voice.split('-')[0], name: voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: speed }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google TTS API error:', errorData); // Debug log
            throw new Error(`Google TTS API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Google TTS API response received:', data); // Debug log
        return data;
    } catch (error) {
        console.error('Error during Google TTS API request:', error); // Debug log
        throw error;
    }
}

// Create audio element from TTS response
function createAudioFromResponse(ttsResponse: TTSResponse): HTMLAudioElement {
    const audio = new Audio(`data:audio/mp3;base64,${ttsResponse.audioContent}`);
    return audio;
}

// Additional debugging for audio playback
async function synthesizeAndPlay(text: string, voice: string, speed: number): Promise<void> {
    console.log('Starting synthesis and playback with:', { text, voice, speed }); // Debug log

    if (!text || !voice || !userApiKey) {
        console.error('Missing required parameters for synthesis:', { text, voice, userApiKey }); // Debug log
        chrome.runtime.sendMessage({ 
            action: 'ttsError', 
            error: !userApiKey ? 'No API key provided' : 'Missing text or voice selection'
        });
        return;
    }

    try {
        const ttsResponse = await callGoogleTTSAPI(text, voice, speed);
        if (!ttsResponse.audioContent) {
            console.error('No audio content received from Google TTS API.'); // Debug log
            return;
        }

        const audio = new Audio(`data:audio/mp3;base64,${ttsResponse.audioContent}`);
        console.log('Audio element created:', audio); // Debug log

        audio.onplay = () => console.log('Audio playback started.'); // Debug log
        audio.onended = () => console.log('Audio playback ended.'); // Debug log
        audio.onerror = (error) => console.error('Audio playback error:', error); // Debug log

        audio.play().catch(error => {
            console.error('Error during audio playback:', error); // Debug log
        });
    } catch (error) {
        console.error('Error during synthesis and playback:', error); // Debug log
    }
}

// Start playback of audio queue
function startPlayback(): void {
    if (audioQueue.length === 0 || isPlayingQueue) return;
    
    isPlayingQueue = true;
    currentChunkIndex = 0;
    playCurrentChunk();
    
    // Inform UI about playback starting
    chrome.runtime.sendMessage({ 
        action: 'playbackStarted',
        totalDuration,
        totalChunks: audioQueue.length
    });
}

// Play the current chunk in the queue
function playCurrentChunk(): void {
    if (!isPlayingQueue || currentChunkIndex >= audioQueue.length) {
        isPlayingQueue = false;
        chrome.runtime.sendMessage({ action: 'playbackComplete' });
        return;
    }
    
    const chunk = audioQueue[currentChunkIndex];
    currentAudio = chunk.audio;
    
    // Apply playback rate
    currentAudio.playbackRate = playbackSettings.speed;
    
    // Set up event handlers
    currentAudio.onended = () => {
        // Move to next chunk when this one ends
        currentChunkIndex++;
        playCurrentChunk();
    };
    
    currentAudio.ontimeupdate = () => {
        // Update current playback time
        if (currentAudio) {
            currentTime = chunk.startTime + currentAudio.currentTime;
            
            // Send progress updates to UI
            chrome.runtime.sendMessage({
                action: 'playbackProgress',
                currentTime,
                totalDuration,
                currentChunk: currentChunkIndex,
                totalChunks: audioQueue.length
            });
            
            // Handle text highlighting
            if (playbackSettings.enableHighlight) {
                // Calculate how much of the current chunk has been spoken
                const chunkProgress = currentAudio.currentTime / currentAudio.duration;
                const chunkText = chunk.text;
                
                // For word highlighting, estimate the current word
                if (playbackSettings.highlightType === 'word') {
                    const words = chunkText.split(/\s+/);
                    const wordIndex = Math.floor(chunkProgress * words.length);
                    const currentWord = words[wordIndex];
                    
                    if (currentWord) {
                        // Send message to content script to highlight current word
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
                            if (tabs[0]?.id) {
                                chrome.tabs.sendMessage(tabs[0].id, {
                                    action: 'highlightText',
                                    text: currentWord,
                                    options: {
                                        type: 'word',
                                        enabled: true
                                    }
                                });
                            }
                        });
                    }
                } else {
                    // For sentence highlighting, use the whole chunk
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]?.id) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'highlightText',
                                text: chunkText,
                                options: {
                                    type: 'sentence',
                                    enabled: true
                                }
                            });
                        }
                    });
                }
            }
        }
    };
    
    // Play the audio
    chunk.isPlaying = true;
    currentAudio.play().catch(error => {
        console.error('Error playing audio:', error);
        chrome.runtime.sendMessage({ 
            action: 'ttsError', 
            error: 'Error playing audio: ' + error.message 
        });
    });
}

// Pause the current playback
function pausePlayback(): void {
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        chrome.runtime.sendMessage({ action: 'playbackPaused' });
    }
}

// Resume the current playback
function resumePlayback(): void {
    if (currentAudio && currentAudio.paused) {
        currentAudio.play().catch(error => {
            console.error('Error resuming audio:', error);
        });
        chrome.runtime.sendMessage({ action: 'playbackResumed' });
    }
}

// Stop all playback
function stopPlayback(): void {
    isPlayingQueue = false;
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    // Clear highlights
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'clearHighlights'
            });
        }
    });
    
    audioQueue = [];
    chrome.runtime.sendMessage({ action: 'playbackStopped' });
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
                
                // Update speed of current playback if active
                if (currentAudio && request.settings.speed) {
                    currentAudio.playbackRate = request.settings.speed;
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
    
    return true; // Indicates async response
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
        // Get current voice and settings
        chrome.storage.local.get(['selectedVoice', 'playbackSettings'], (result: {selectedVoice?: string, playbackSettings?: PlaybackSettings}) => {
            const voice = result.selectedVoice || 'en-US-Neural2-A';
            const speed = result.playbackSettings?.speed || 1;
            
            if (tab?.id && info.selectionText) {
                // Read the selected text
                synthesizeAndPlay(info.selectionText, voice, speed);
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
        return true; // Indicate that the response will be sent asynchronously
    }
});
