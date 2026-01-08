#!/bin/bash
set -e

# ngrok Setup Script for CourierX
# Exposes local Rails API for webhook testing

echo "🌐 CourierX ngrok Setup"
echo "======================="

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Install ngrok:"
    echo "  macOS:   brew install ngrok"
    echo "  Linux:   snap install ngrok"
    echo "  Windows: choco install ngrok"
    echo ""
    echo "Or download from: https://ngrok.com/download"
    exit 1
fi

echo "✓ ngrok is installed"

# Check for authtoken
if [ -z "$NGROK_AUTHTOKEN" ]; then
    echo ""
    echo "⚠️  NGROK_AUTHTOKEN not set"
    echo ""
    echo "Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo ""
    read -p "Enter your ngrok authtoken: " NGROK_AUTHTOKEN

    if [ -z "$NGROK_AUTHTOKEN" ]; then
        echo "❌ Authtoken required"
        exit 1
    fi

    # Save to .env
    echo "NGROK_AUTHTOKEN=$NGROK_AUTHTOKEN" >> .env.local
    echo "✓ Saved to .env.local"
fi

# Configure ngrok
ngrok config add-authtoken $NGROK_AUTHTOKEN
echo "✓ ngrok configured"

# Port to expose
PORT=${1:-4000}

echo ""
echo "🚀 Starting ngrok tunnel..."
echo "   Local:  http://localhost:$PORT"
echo "   Expose: Rails API for webhooks"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start ngrok
ngrok http $PORT

# When ngrok stops
echo ""
echo "✓ ngrok tunnel closed"
