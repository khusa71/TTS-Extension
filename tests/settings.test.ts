// Test file for settings.ts
/// <reference types="jest" />
import { loadSettings, saveSettings, getThemePreference, setThemePreference } from '../src/settings';
import { PlaybackSettings } from '../src/settings';

// Access the global chrome API mock
const chromeMock = globalThis.chrome;

describe('Settings Module', () => {
  // Mock chrome storage
  beforeEach(() => {
    (chromeMock.storage.local.get as jest.Mock).mockClear();
    (chromeMock.storage.local.set as jest.Mock).mockClear();
    (chromeMock.runtime.sendMessage as jest.Mock).mockClear();
  });

  test('loadSettings returns default values when nothing in storage', () => {
    // Mock empty storage
    (chromeMock.storage.local.get as jest.Mock).mockImplementation(
      (keys: string | string[] | { [key: string]: any } | null, 
       callback: (items: { [key: string]: any }) => void) => {
      callback({});
    });

    const callback = jest.fn();
    loadSettings(callback);

    expect(chromeMock.storage.local.get).toHaveBeenCalledWith(['playbackSettings'], expect.any(Function));
    expect(callback).toHaveBeenCalledWith({
      speed: 1,
      highlightType: 'word',
      enableHighlight: true
    });
  });

  test('loadSettings returns stored values when available', () => {
    // Mock storage with values
    const storedSettings: PlaybackSettings = {
      speed: 1.5,
      highlightType: 'sentence',
      enableHighlight: false
    };
    
    (chromeMock.storage.local.get as jest.Mock).mockImplementation(
      (keys: string | string[] | { [key: string]: any } | null, 
       callback: (items: { [key: string]: any }) => void) => {
      callback({ playbackSettings: storedSettings });
    });

    const callback = jest.fn();
    loadSettings(callback);

    expect(callback).toHaveBeenCalledWith(storedSettings);
  });

  test('saveSettings updates existing settings and sends message', () => {
    // Mock existing settings
    const existingSettings: PlaybackSettings = {
      speed: 1,
      highlightType: 'word',
      enableHighlight: true
    };
    
    (chromeMock.storage.local.get as jest.Mock).mockImplementation(
      (keys: string | string[] | { [key: string]: any } | null, 
       callback: (items: { [key: string]: any }) => void) => {
      callback({ playbackSettings: existingSettings });
    });

    const newPartialSettings = {
      speed: 1.5
    };
    const callback = jest.fn();
    
    saveSettings(newPartialSettings, callback);

    // Check that chrome.storage.local.set was called with merged settings
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      playbackSettings: {
        speed: 1.5, // Updated
        highlightType: 'word', // Unchanged
        enableHighlight: true // Unchanged
      }
    }, expect.any(Function));

    // Check that message was sent to update background settings
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith({
      action: "updateSettings",
      settings: {
        speed: 1.5,
        highlightType: 'word',
        enableHighlight: true
      }
    });
  });

  test('getThemePreference returns dark mode preference', () => {
    // Use the actual localStorage mock instead of spying on prototype
    const mockGetItem = jest.fn();
    const originalGetItem = localStorage.getItem;
    
    // Replace with mock temporarily
    localStorage.getItem = mockGetItem;
    
    // Test dark mode enabled
    mockGetItem.mockReturnValue('1');
    expect(getThemePreference()).toBe(true);
    expect(mockGetItem).toHaveBeenCalledWith('tts_theme_dark');
    
    // Test dark mode disabled
    mockGetItem.mockReturnValue('0');
    expect(getThemePreference()).toBe(false);
    
    // Test default case
    mockGetItem.mockReturnValue(null);
    expect(getThemePreference()).toBe(false);
    
    // Restore original
    localStorage.getItem = originalGetItem;
  });

  test('setThemePreference saves preference to localStorage', () => {
    // Use the actual localStorage mock instead of spying on prototype
    const mockSetItem = jest.fn();
    const originalSetItem = localStorage.setItem;
    
    // Replace with mock temporarily
    localStorage.setItem = mockSetItem;
    
    // Test dark mode enabled
    setThemePreference(true);
    expect(mockSetItem).toHaveBeenCalledWith('tts_theme_dark', '1');
    
    // Test dark mode disabled
    setThemePreference(false);
    expect(mockSetItem).toHaveBeenCalledWith('tts_theme_dark', '0');
    
    // Restore original
    localStorage.setItem = originalSetItem;
  });
});
