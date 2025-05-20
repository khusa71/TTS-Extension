// Chrome API mock for testing
/// <reference types="jest" />

// Create the mock Chrome object with Jest functions
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
  },
  tts: {
    getVoices: (callback: (voices: Array<{ voiceName: string; lang: string; gender: string; extensionId: string | null }>) => void) => {
      callback([
        { voiceName: 'Voice 1', lang: 'en-US', gender: 'male', extensionId: null },
        { voiceName: 'Voice 2', lang: 'en-GB', gender: 'female', extensionId: null }
      ]);
    },
  },
};

// Mock localStorage
class LocalStorageMock implements Storage {
  private store: Record<string, string> = {};
  length: number = 0;
  key(index: number): string | null { return null; }

  clear(): void {
    this.store = {};
    this.length = 0;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
    this.length = Object.keys(this.store).length;
  }

  removeItem(key: string): void {
    delete this.store[key];
    this.length = Object.keys(this.store).length;
  }
}

// Add mocks to global object
Object.defineProperty(globalThis, 'chrome', { value: mockChrome });
Object.defineProperty(globalThis, 'localStorage', { value: new LocalStorageMock() });

export {}; // Make this a module
