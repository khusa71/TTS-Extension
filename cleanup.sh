#!/bin/zsh
# Script to remove unused JavaScript files after TypeScript migration

echo "Cleaning up unused JavaScript files..."

# Define the list of files to remove
FILES_TO_REMOVE=(
  "background.js"
  "popup.js"
  "ui.js"
  "settings.js"
  "tts_highlight_content.js"
  "tests/setup.js"
)

# Remove each file
for file in "${FILES_TO_REMOVE[@]}"; do
  if [[ -f "$file" ]]; then
    echo "Removing $file..."
    rm "$file"
  else
    echo "$file not found, skipping..."
  fi
done

echo "Cleanup complete!"
