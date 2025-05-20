// Advanced highlighting options
/// <reference types="chrome" />

export interface HighlightOptions {
  enabled: boolean;
  type: 'word' | 'sentence';
  color: string;
  backgroundColor: string;
  useBold: boolean;
  useUnderline: boolean;
  transitionSpeed: 'slow' | 'medium' | 'fast';
}

export const DEFAULT_HIGHLIGHT_OPTIONS: HighlightOptions = {
  enabled: true,
  type: 'word',
  color: '#000000',
  backgroundColor: 'rgba(255, 245, 157, 0.5)',
  useBold: false,
  useUnderline: false,
  transitionSpeed: 'medium'
};

export function applyHighlightStyle(element: HTMLElement, options: HighlightOptions): void {
  if (!options.enabled) return;
  
  const transitionSpeedMap = {
    slow: '0.5s',
    medium: '0.3s',
    fast: '0.1s'
  };
  
  // Apply styles based on options
  element.style.backgroundColor = options.backgroundColor;
  if (options.color !== '#000000') {
    element.style.color = options.color;
  }
  if (options.useBold) {
    element.style.fontWeight = 'bold';
  }
  if (options.useUnderline) {
    element.style.textDecoration = 'underline';
  }
  element.style.transition = `all ${transitionSpeedMap[options.transitionSpeed]} ease`;
  element.style.borderRadius = '3px';
}

export function generateHighlightCSS(options: HighlightOptions): string {
  if (!options.enabled) return '';
  
  const transitionSpeedMap = {
    slow: '0.5s',
    medium: '0.3s',
    fast: '0.1s'
  };
  
  return `
    .tts-highlight-line {
      background: ${options.backgroundColor};
      ${options.color !== '#000000' ? `color: ${options.color};` : ''}
      ${options.useBold ? 'font-weight: bold;' : ''}
      ${options.useUnderline ? 'text-decoration: underline;' : ''}
      border-radius: 3px;
      transition: all ${transitionSpeedMap[options.transitionSpeed]} ease;
    }
    .tts-highlight-word {
      background: ${options.backgroundColor};
      ${options.color !== '#000000' ? `color: ${options.color};` : ''}
      ${options.useBold ? 'font-weight: bold;' : ''}
      ${options.useUnderline ? 'text-decoration: underline;' : ''}
      border-radius: 2px;
      transition: all ${transitionSpeedMap[options.transitionSpeed]} ease;
    }
    .tts-highlight-container {
      display: inline;
      position: relative;
    }
  `;
}

// Function to parse RGB/RGBA/HEX colors into standard format
export function normalizeColor(color: string): string {
  // Handle hex
  if (color.startsWith('#')) {
    return color;
  }
  
  // Handle rgb/rgba
  if (color.startsWith('rgb')) {
    return color;
  }
  
  // Handle named colors by creating a temporary element
  const tempElement = document.createElement('div');
  tempElement.style.color = color;
  document.body.appendChild(tempElement);
  const computedColor = getComputedStyle(tempElement).color;
  document.body.removeChild(tempElement);
  
  return computedColor;
}

// Save highlight options
export function saveHighlightOptions(options: HighlightOptions): void {
  chrome.storage.local.set({ highlightOptions: options });
}

// Load highlight options
export function loadHighlightOptions(callback: (options: HighlightOptions) => void): void {
  chrome.storage.local.get(['highlightOptions'], (result: {highlightOptions?: HighlightOptions}) => {
    const options = result.highlightOptions || DEFAULT_HIGHLIGHT_OPTIONS;
    callback(options);
  });
}
