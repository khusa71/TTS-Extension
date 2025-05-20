#!/bin/zsh
# Build script for the TTS Extension

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${YELLOW}Building TTS Extension...${NC}"

# Clean output directory
echo "${YELLOW}Cleaning dist directory...${NC}"
npm run clean

# Run TypeScript type checking
echo "${YELLOW}Running TypeScript type checking...${NC}"
npm run typecheck

# Exit if TypeScript has errors
if [ $? -ne 0 ]; then
  echo "${RED}TypeScript errors found. Fix them before building.${NC}"
  exit 1
fi

# Run ESLint
echo "${YELLOW}Running ESLint...${NC}"
npm run lint

# Run webpack to build the extension
echo "${YELLOW}Building extension...${NC}"
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "${GREEN}Build completed successfully!${NC}"
  echo "${GREEN}Extension files are in the dist directory.${NC}"
else
  echo "${RED}Build failed. Check the errors above.${NC}"
  exit 1
fi

# Run tests
echo "${YELLOW}Running tests...${NC}"
npm test

# Create a zip file for distribution if build was successful
if [ $? -eq 0 ]; then
  echo "${YELLOW}Creating distribution zip file...${NC}"
  cd dist
  zip -r ../tts-extension.zip *
  cd ..
  echo "${GREEN}Extension packaged as tts-extension.zip${NC}"
fi

echo "${GREEN}Build process completed.${NC}"
