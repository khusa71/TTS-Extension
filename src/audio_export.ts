// Audio export functionality
/// <reference types="chrome" />

export interface ExportOptions {
  format: 'mp3' | 'wav';
  quality: 'standard' | 'high';
  splitByParagraph: boolean;
  filename: string;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'mp3',
  quality: 'standard',
  splitByParagraph: false,
  filename: 'tts_export'
};

// Convert base64 audio data to a Blob
function base64ToBlob(base64Data: string, contentType: string): Blob {
  const byteCharacters = atob(base64Data);
  const byteArrays: Uint8Array[] = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: contentType });
}

// Create a download link for audio
function createDownloadLink(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to body, trigger click, and clean up
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

// Export audio data as a file
export function exportAudio(audioData: string, options: ExportOptions): void {
  const contentTypeMap = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav'
  };
  
  const blob = base64ToBlob(audioData, contentTypeMap[options.format]);
  const filename = `${options.filename}.${options.format}`;
  
  createDownloadLink(blob, filename);
}

// Split text into paragraphs for batch processing
export function splitIntoParagraphs(text: string): string[] {
  // Simple split by double newlines or period followed by newline
  return text
    .split(/\n\s*\n|\.\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

// Save export options
export function saveExportOptions(options: ExportOptions): void {
  chrome.storage.local.set({ exportOptions: options });
}

// Load export options
export function loadExportOptions(callback: (options: ExportOptions) => void): void {
  chrome.storage.local.get(['exportOptions'], (result: {exportOptions?: ExportOptions}) => {
    const options = result.exportOptions || DEFAULT_EXPORT_OPTIONS;
    callback(options);
  });
}
