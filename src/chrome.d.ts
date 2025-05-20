// Type definitions for Chrome APIs and extensions
// This file contains Chrome-specific type definitions that we use in the extension

interface ChromeStorageCallback {
  (items: { [key: string]: any }): void;
}

interface ChromeStorageArea {
  get(keys: string | string[] | Object | null, callback: ChromeStorageCallback): void;
  set(items: Object, callback?: () => void): void;
  remove(keys: string | string[], callback?: () => void): void;
  clear(callback?: () => void): void;
}

interface ChromeStorage {
  local: ChromeStorageArea;
  sync: ChromeStorageArea;
}

interface ChromeRuntime {
  onMessage: {
    addListener(callback: (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => void): void;
  };
  sendMessage(message: any, responseCallback?: (response: any) => void): void;
}

interface ChromeTabs {
  query(queryInfo: { active?: boolean; currentWindow?: boolean }, callback: (tabs: chrome.tabs.Tab[]) => void): void;
  sendMessage(tabId: number, message: any, options?: any, responseCallback?: (response: any) => void): void;
}

interface ChromeContextMenus {
  create(properties: any, callback?: () => void): void;
  onClicked: {
    addListener(callback: (info: any, tab: chrome.tabs.Tab) => void): void;
  };
}

declare namespace chrome {
  export const storage: ChromeStorage;
  export const runtime: ChromeRuntime;
  export const tabs: ChromeTabs;
  export const contextMenus: ChromeContextMenus;
  
  export namespace runtime {
    export interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
    }
  }
  
  export namespace tabs {
    export interface Tab {
      id?: number;
      index: number;
      pinned: boolean;
      highlighted: boolean;
      windowId: number;
      active: boolean;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
    }
  }
}
