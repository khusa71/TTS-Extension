# Premium Text-to-Speech Chrome Extension

A production-ready, premium Chrome extension for text-to-speech using the Google Cloud TTS API. Features a modern, user-friendly UI/UX, advanced playback/highlighting controls, robust settings management, and is modular and maintainable for paying users.

---

## Features

- **Google Cloud TTS API Integration**: Use your own API key for high-quality voices.
- **Voice Selection & Filtering**: Search, filter, and select from all available Google voices, grouped by language and type (Neural2, Wavenet, Standard).
- **Speed & Highlight Controls**: Adjust playback speed on the fly, with instant highlight updates and custom highlight options.
- **Modern UI/UX**: Premium look, responsive design, onboarding modal, tooltips, and ARIA accessibility.
- **Dark Mode**: Toggle and persist dark/light theme.
- **Keyboard Shortcuts**: Control playback with Space, S, N, P, R, L (see onboarding for details).
- **Settings Persistence**: All preferences and API key are saved securely.
- **Error Handling**: Robust feedback for API, playback, and settings issues.
- **Modular Codebase**: UI, voice, shortcut, and settings logic are separated for maintainability.

---

## Installation

1. **Clone or Download** this repository.
2. **Get a Google Cloud TTS API Key** ([instructions](https://cloud.google.com/text-to-speech/docs/quickstart-client-libraries)).
3. **Build the Extension**:
   - Install dependencies: `npm install`
   - Build the extension: `./build.sh` or `npm run build`
4. **Load the Extension**:
   - Go to `chrome://extensions` in Chrome.
   - Enable "Developer mode".
   - Click "Load unpacked" and select the `dist` folder.
5. **Open the Extension** and enter your API key in the popup.

---

## Usage

- **Select a Voice**: Use the dropdown and search/filter to find your preferred voice.
- **Adjust Speed**: Use the slider or preset buttons.
- **Highlight Options**: Enable/disable and choose highlight style.
- **Playback Controls**: Use the buttons or keyboard shortcuts:
  - `Space`: Play/Pause
  - `S`: Stop
  - `N`: Next chunk
  - `P`: Previous chunk
  - `R`: Read Page
  - `L`: Read Selection
- **Dark Mode**: Toggle with the moon/sun icon.
- **Onboarding & Tooltips**: Hover for help, or re-open onboarding from settings.

---

## Roadmap & Improvements

- [x] Modularize UI, voice, shortcut, and settings logic
- [x] Modern, accessible UI/UX with onboarding and tooltips
- [x] Voice search/filter and selection persistence
- [x] Advanced highlighting and speed controls
- [x] Keyboard shortcuts for all playback
- [x] Add TypeScript and automated tests
- [x] Advanced highlighting (custom color, disable on demand)
- [x] Export audio, pronunciation dictionary, auto language detection
- [x] Optimize background.js for performance and error recovery
- [x] CI/CD for automated builds and linting

### Recently Added Features

- **TypeScript Migration**: Complete codebase migration to TypeScript
- **Advanced Highlighting Options**: Customize color, style, and transition effects
- **Audio Export**: Save TTS audio as MP3 or WAV files
- **Pronunciation Dictionary**: Define custom pronunciation rules
- **Auto Language Detection**: Automatically detect text language
- **Performance Optimizations**: Audio caching, request batching, and retry mechanisms
- **CI/CD Pipeline**: Automated testing, linting, and builds
- **Unit Tests**: Comprehensive test coverage
- **Improved Build Process**: Webpack-based build with proper optimization

---

## Development

### Project Structure
```
├── public/           # Static files copied to dist directory
│   ├── images/       # Extension icons
│   ├── manifest.json # Extension manifest
│   ├── popup.html    # Extension popup HTML
│   └── popup.css     # Extension popup styles
├── src/              # TypeScript source code
│   ├── audio_export.ts
│   ├── background.ts
│   ├── highlight.ts
│   ├── language_detection.ts
│   ├── performance_optimization.ts
│   ├── popup.ts
│   ├── pronunciation_dictionary.ts
│   ├── tts_highlight_content.ts
│   ├── types.d.ts    # TypeScript type definitions
│   └── ui.ts
├── tests/            # Test files
├── dist/             # Build output (generated)
├── build.sh          # Build script
├── cleanup.sh        # Cleanup script for old JS files
├── package.json      # NPM package configuration
├── tsconfig.json     # TypeScript configuration
└── webpack.config.js # Webpack configuration
```

### Available Scripts
- `npm install` - Install dependencies
- `npm run build` - Build the extension for production
- `npm run dev` - Build with watch mode for development
- `npm run lint` - Run ESLint to check code quality
- `npm run test` - Run tests
- `./build.sh` - Full build process with testing and packaging

### Building for Development
```bash
npm install
npm run dev
```

### Building for Production
```bash
./build.sh
# or
npm run build
```

---

## Contributing

Pull requests and suggestions are welcome! Please open an issue for bugs or feature requests.

---

## License

MIT License
