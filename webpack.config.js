const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production', // Explicitly set the mode to 'production'
  entry: {
    background: './src/background.ts',
    popup: './src/popup.ts',
    content: './src/tts_highlight_content.ts',
    diagnostics: './src/tts_diagnostics.ts' // Add the diagnostics entry point
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '.' },
        { from: 'cache.css', to: 'cache.css' },
        { from: 'language_detection.css', to: 'language_detection.css' },
        { from: 'voice_preferences.css', to: 'voice_preferences.css' },
      ],
    }),
  ],
};
