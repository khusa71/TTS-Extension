// Content script for text highlighting
/// <reference types="chrome" />
import { HighlightOptions, DEFAULT_HIGHLIGHT_OPTIONS, generateHighlightCSS } from './highlight';

export interface HighlightMatch {
    node: Node;
    startIndex: number;
    endIndex: number;
    element?: HTMLElement;
}

(function() {
    // Default styles if no advanced options are available
    const STYLES = `
        .tts-highlight-line {
            background: rgba(255, 245, 157, 0.5);
            border-radius: 3px;
            transition: background 0.3s ease;
        }
        .tts-highlight-word {
            background: rgba(255, 245, 157, 0.9);
            border-radius: 2px;
            transition: all 0.2s ease;
        }
        .tts-highlight-container {
            display: inline;
            position: relative;
        }
    `;

    // Add styles to page
    function addHighlightStyles(css: string = STYLES): void {
        const existingStyle = document.getElementById('tts-highlight-styles');
        if (existingStyle) {
            existingStyle.textContent = css;
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'tts-highlight-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Initialize with default styles
    addHighlightStyles();

    // Clear existing highlights
    function clearHighlights(): void {
        document.querySelectorAll('.tts-highlight-line, .tts-highlight-word, .tts-highlight-container').forEach(el => {
            if (el.classList.contains('tts-highlight-container')) {
                // Unwrap container
                const parent = el.parentNode;
                if (!parent) return;
                
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
            } else {
                el.outerHTML = el.textContent || '';
            }
        });
    }

    // Find text in visible elements
    function findTextInView(searchText: string): HighlightMatch[] {
        const matches: HighlightMatch[] = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node: Node): number {
                    if (!(node.parentElement)) return NodeFilter.FILTER_REJECT;
                    
                    const element = node.parentElement;
                    const style = window.getComputedStyle(element);
                    return style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           !element.closest('script, style') &&
                           node.textContent && node.textContent.trim() ?
                           NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        let currentNode: Node | null;
        while (currentNode = walker.nextNode()) {
            const nodeText = currentNode.textContent || '';
            const textIndex = nodeText.indexOf(searchText);
            
            if (textIndex !== -1) {
                matches.push({
                    node: currentNode,
                    startIndex: textIndex,
                    endIndex: textIndex + searchText.length
                });
            }
        }

        return matches;
    }

    // Highlight text on page
    function highlightText(text: string, options: HighlightOptions = DEFAULT_HIGHLIGHT_OPTIONS): void {
        clearHighlights();
        
        // Update CSS with current highlight options
        addHighlightStyles(generateHighlightCSS(options));
        
        if (!text || !options.enabled) return;
        
        const matches = findTextInView(text);
        
        matches.forEach(match => {
            const node = match.node;
            const parent = node.parentNode;
            if (!parent) return;
            
            const highlightElement = document.createElement('span');
            highlightElement.className = options.type === 'word' ? 'tts-highlight-word' : 'tts-highlight-line';
            
            // Split the text node
            const beforeText = node.textContent?.substring(0, match.startIndex) || '';
            const highlightText = node.textContent?.substring(match.startIndex, match.endIndex) || '';
            const afterText = node.textContent?.substring(match.endIndex) || '';
            
            // Create the nodes
            const beforeNode = document.createTextNode(beforeText);
            const afterNode = document.createTextNode(afterText);
            
            // Set the text to highlight
            highlightElement.textContent = highlightText;
            
            // Replace the original node
            const container = document.createElement('span');
            container.className = 'tts-highlight-container';
            
            container.appendChild(beforeNode);
            container.appendChild(highlightElement);
            container.appendChild(afterNode);
            
            parent.replaceChild(container, node);
            match.element = highlightElement;
        });
    }

    // Highlight the currently spoken text
    function highlightSpokenText(text: string): void {
        clearHighlights(); // Clear previous highlights
        const matches = findTextInView(text);

        matches.forEach(match => {
            const range = document.createRange();
            range.setStart(match.node, match.startIndex);
            range.setEnd(match.node, match.endIndex);

            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'tts-highlight-word';
            range.surroundContents(highlightSpan);
        });
    }

    // Handle messages from background
    chrome.runtime.onMessage.addListener((request: {action: string, text?: string, options?: HighlightOptions}, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        if (request.action === 'highlightText') {
            highlightText(request.text || '', request.options);
            sendResponse({ success: true });
        } else if (request.action === 'clearHighlights') {
            clearHighlights();
            sendResponse({ success: true });
        }
        return true;
    });

    // Listen for messages to highlight text
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'highlightText' && message.text) {
            highlightSpokenText(message.text);
            sendResponse({ success: true });
        }
    });
})();
