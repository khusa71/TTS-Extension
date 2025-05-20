// Type definitions for Chrome TTS Extension
// This file contains shared types and interfaces used across the extension

declare namespace TTSExtension {
  // Voice-related types
  interface Voice {
    name: string;
    languageCode: string;
    gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
    type: 'Neural2' | 'WaveNet' | 'Standard';
  }

  // API Response types
  interface GoogleTTSResponse {
    audioContent: string;
  }

  // Playback-related types
  interface PlaybackState {
    isPlaying: boolean;
    isPaused: boolean;
    currentTime: number;
    totalDuration: number;
    currentChunk: number;
    totalChunks: number;
  }

  // Message types for communication between scripts
  type MessageType = 
    | 'readText'
    | 'stopReading'
    | 'pauseReading'
    | 'resumeReading'
    | 'apiKeyUpdated'
    | 'nextChunk'
    | 'previousChunk'
    | 'jumpToChunk'
    | 'updateSettings'
    | 'getPlaybackState'
    | 'playbackStarted'
    | 'playbackPaused'
    | 'playbackResumed'
    | 'playbackStopped'
    | 'playbackComplete'
    | 'playbackProgress'
    | 'ttsError'
    | 'highlightText'
    | 'clearHighlights';

  // Common error types
  interface TTSError {
    code: string;
    message: string;
    details?: string;
  }
}
