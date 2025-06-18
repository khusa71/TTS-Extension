/**
 * Diagnoses common issues with Google Cloud TTS setup and provides helpful messages
 */
export declare function diagnoseTTSSetup(apiKey: string): Promise<{
    isValid: boolean;
    message: string;
    details?: string;
}>;
/**
 * Tests TTS synthesis with a simple request to verify the API is working properly
 */
export declare function testTTSSynthesis(apiKey: string, voice: string): Promise<{
    success: boolean;
    message: string;
    audioData?: string;
}>;
/**
 * Validates browser audio support to ensure the audio format from Google TTS can be played
 */
export declare function validateAudioSupport(): {
    supported: boolean;
    message: string;
    details?: string;
};
/**
 * Utility to test playback of base64 encoded audio
 */
export declare function testAudioPlayback(base64Audio: string): Promise<boolean>;
/**
 * Runs a full diagnostic check on the TTS setup
 */
export declare function runFullDiagnostics(apiKey: string, selectedVoice?: string): Promise<{
    apiValid: boolean;
    audioSupported: boolean;
    synthesisWorks?: boolean;
    playbackWorks?: boolean;
    overallStatus: 'success' | 'warning' | 'error';
    messages: string[];
}>;
