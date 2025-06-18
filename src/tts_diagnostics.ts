// tts_diagnostics.ts - Utilities for diagnostics and troubleshooting TTS issues

/**
 * Diagnoses common issues with Google Cloud TTS setup and provides helpful messages
 */
export async function diagnoseTTSSetup(apiKey: string): Promise<{
    isValid: boolean;
    message: string;
    details?: string;
}> {
    console.log('Running TTS setup diagnostics...');
    
    // Check if API key is provided
    if (!apiKey) {
        return {
            isValid: false,
            message: 'No API key provided',
            details: 'Please enter your Google Cloud API key in the extension settings.'
        };
    }
    
    // Basic format validation (Google Cloud API keys are typically ~40 characters)
    if (!/^[A-Za-z0-9_-]{20,}$/.test(apiKey)) {
        return {
            isValid: false,
            message: 'API key format appears invalid',
            details: 'Google Cloud API keys are typically ~40 characters long and only contain letters, numbers, underscores, and hyphens.'
        };
    }
    
    // Test the API key with a minimal request
    try {
        const url = `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`;
        console.log('Testing API key with voices endpoint...');
        
        const response = await fetch(url);
        console.log('API test response status:', response.status);
        
        if (!response.ok) {
            let details = '';
            
            if (response.status === 403) {
                details = 'This could indicate:\n' +
                    '1. The API key is invalid\n' +
                    '2. The Text-to-Speech API is not enabled in your Google Cloud Console\n' +
                    '3. The API key has restrictions that prevent it from being used with this extension\n\n' +
                    'Please check these settings in your Google Cloud Console.';
                
                return {
                    isValid: false,
                    message: 'API key authentication failed (403 Forbidden)',
                    details
                };
            } 
            
            if (response.status === 404) {
                return {
                    isValid: false,
                    message: 'API endpoint not found (404)',
                    details: 'The Text-to-Speech API URL might have changed or the service is temporarily unavailable.'
                };
            }
            
            if (response.status === 429) {
                return {
                    isValid: false,
                    message: 'API quota exceeded (429)',
                    details: 'You have reached the usage limit for your Google Cloud TTS API. Check your quota in the Google Cloud Console.'
                };
            }
            
            try {
                const errorData = await response.json();
                return {
                    isValid: false,
                    message: `API error (${response.status})`,
                    details: `Error message: ${errorData.error?.message || 'Unknown error'}`
                };
            } catch (jsonError) {
                return {
                    isValid: false,
                    message: `API error (${response.status})`,
                    details: `Status: ${response.statusText}`
                };
            }
        }
        
        // Try to parse response as JSON
        try {
            const data = await response.json();
            
            if (!data.voices || !Array.isArray(data.voices) || data.voices.length === 0) {
                return {
                    isValid: false,
                    message: 'No voices returned from API',
                    details: 'The API returned successfully but no voices were found. This might indicate an issue with your Google Cloud project configuration.'
                };
            }
            
            return {
                isValid: true,
                message: `API connection successful (${data.voices.length} voices available)`,
                details: 'Your Google Cloud TTS API setup is valid and working correctly.'
            };
        } catch (jsonError) {
            return {
                isValid: false,
                message: 'Invalid response from API',
                details: 'The API returned a response, but it was not in the expected format. This might indicate an issue with the Google Cloud TTS API.'
            };
        }
    } catch (networkError: any) {
        return {
            isValid: false,
            message: 'Network error',
            details: `Error connecting to Google Cloud TTS API: ${networkError.message}`
        };
    }
}

/**
 * Tests TTS synthesis with a simple request to verify the API is working properly
 */
export async function testTTSSynthesis(apiKey: string, voice: string): Promise<{
    success: boolean;
    message: string;
    audioData?: string;
}> {
    // Use a simple test phrase
    const testText = "This is a test of the Text-to-Speech API.";
    const apiUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    console.log(`Testing TTS synthesis with voice: ${voice}`);
    
    const requestData = {
        input: { text: testText },
        voice: { languageCode: voice.split('-')[0], name: voice },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 }
    };
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            let errorMessage = `HTTP error: ${response.status} ${response.statusText}`;
            
            try {
                const errorData = await response.json();
                errorMessage = `Google TTS API error: ${errorData.error?.message || response.statusText}`;
            } catch (jsonError) {
                // If we can't parse the error as JSON, use the status text
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
        
        const data = await response.json();
        
        if (!data.audioContent) {
            return {
                success: false,
                message: 'No audio content received from Google TTS API'
            };
        }
        
        return {
            success: true,
            message: 'TTS synthesis successful',
            audioData: data.audioContent
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Error during TTS synthesis: ${error.message}`
        };
    }
}

/**
 * Validates browser audio support to ensure the audio format from Google TTS can be played
 */
export function validateAudioSupport(): {
    supported: boolean;
    message: string;
    details?: string;
} {
    const audio = new Audio();
    
    // Check if MP3 is supported (Google TTS uses MP3)
    const canPlayMP3 = audio.canPlayType('audio/mp3') !== '';
    
    if (!canPlayMP3) {
        return {
            supported: false,
            message: 'MP3 audio format not supported',
            details: 'Your browser does not support the MP3 format used by Google TTS. Try using a different browser.'
        };
    }
    
    // Check for other potential issues
    if (typeof HTMLAudioElement === 'undefined') {
        return {
            supported: false,
            message: 'Audio API not supported',
            details: 'Your browser does not support the HTML Audio API. Try using a different browser.'
        };
    }
    
    return {
        supported: true,
        message: 'Audio support validated',
        details: 'Your browser supports the audio formats required for TTS playback.'
    };
}

/**
 * Utility to test playback of base64 encoded audio
 */
export function testAudioPlayback(base64Audio: string): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
            
            // Set up event handlers
            audio.onplay = () => {
                console.log('Audio playback test: Playback started successfully');
            };
            
            audio.onended = () => {
                console.log('Audio playback test: Playback completed successfully');
                resolve(true);
            };
            
            audio.onerror = (error) => {
                console.error('Audio playback test: Playback failed', error);
                console.error('Audio error code:', audio.error?.code);
                resolve(false);
            };
            
            // Start playback with a short timeout to ensure everything is set up
            setTimeout(() => {
                audio.play().catch(error => {
                    console.error('Audio playback test: play() method failed', error);
                    resolve(false);
                });
            }, 100);
        } catch (error) {
            console.error('Audio playback test: Error creating audio element', error);
            resolve(false);
        }
    });
}

/**
 * Runs a full diagnostic check on the TTS setup
 */
export async function runFullDiagnostics(apiKey: string, selectedVoice?: string): Promise<{
    apiValid: boolean;
    audioSupported: boolean;
    synthesisWorks?: boolean;
    playbackWorks?: boolean;
    overallStatus: 'success' | 'warning' | 'error';
    messages: string[];
}> {
    const messages: string[] = [];
    const result = {
        apiValid: false,
        audioSupported: false,
        synthesisWorks: false as boolean | undefined,
        playbackWorks: false as boolean | undefined,
        overallStatus: 'error' as 'success' | 'warning' | 'error',
        messages
    };
    
    // Step 1: Check API setup
    const apiCheck = await diagnoseTTSSetup(apiKey);
    result.apiValid = apiCheck.isValid;
    messages.push(`API Check: ${apiCheck.message}`);
    
    if (apiCheck.details) {
        messages.push(apiCheck.details);
    }
    
    // Step 2: Validate audio support
    const audioCheck = validateAudioSupport();
    result.audioSupported = audioCheck.supported;
    messages.push(`Audio Support: ${audioCheck.message}`);
    
    if (audioCheck.details) {
        messages.push(audioCheck.details);
    }
    
    // Only proceed with synthesis test if API is valid and a voice is provided
    if (apiCheck.isValid && selectedVoice) {
        // Step 3: Test TTS synthesis
        const synthesisTest = await testTTSSynthesis(apiKey, selectedVoice);
        result.synthesisWorks = synthesisTest.success;
        messages.push(`Synthesis Test: ${synthesisTest.message}`);
        
        // Step 4: Test audio playback if synthesis worked
        if (synthesisTest.success && synthesisTest.audioData) {
            const playbackResult = await testAudioPlayback(synthesisTest.audioData);
            result.playbackWorks = playbackResult;
            messages.push(`Playback Test: ${playbackResult ? 'Successful' : 'Failed'}`);
        }
    }
    
    // Determine overall status
    if (result.apiValid && result.audioSupported && result.synthesisWorks && result.playbackWorks) {
        result.overallStatus = 'success';
    } else if (result.apiValid && result.audioSupported) {
        result.overallStatus = 'warning';
    } else {
        result.overallStatus = 'error';
    }
    
    return result;
}

// Initialize our diagnostics module for browser environments
console.log('TTS Diagnostics module loaded');

// This will be the entry point when this file is included directly in a browser
if (typeof window !== 'undefined') {
    // Make diagnostics functions available globally
    (window as any).TTSDiagnostics = {
        diagnoseTTSSetup,
        testTTSSynthesis,
        validateAudioSupport,
        testAudioPlayback,
        runFullDiagnostics
    };
}
