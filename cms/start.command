#!/bin/bash

# =====================================================
# Biagio Photography CMS - Launcher
# Double-click this file to start the CMS
# =====================================================

# Get the directory where this script is located
cd "$(dirname "$0")"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║     📷 Biagio Photography CMS              ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo ""
    echo "Please install Node.js from: https://nodejs.org"
    echo "Download the LTS version and install it."
    echo ""
    echo "Press Enter to close this window..."
    read
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    echo ""
    echo "Please reinstall Node.js from: https://nodejs.org"
    echo ""
    echo "Press Enter to close this window..."
    read
    exit 1
fi

echo -e "${GREEN}✓${NC} npm found: $(npm --version)"

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${YELLOW}📦 Installing dependencies (first time setup)...${NC}"
    echo "   This may take a minute..."
    echo ""
    npm install
    
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        echo "Press Enter to close this window..."
        read
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✓ Dependencies installed successfully!${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Starting CMS server...${NC}"
echo "   The browser will open automatically."
echo ""
echo "   To stop the server, press Ctrl+C or close this window."
echo ""
echo "────────────────────────────────────────────────"
echo ""

# Start the server
npm start

# If the server stops, wait for user input before closing
echo ""
echo "Server stopped."
echo "Press Enter to close this window..."
read
