#!/bin/bash

echo "🧠 Universal AI Brain 3.0 - Cognitive Systems Testing Setup"
echo "=========================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create it with your credentials:"
    echo ""
    echo "MONGODB_URI=mongodb+srv://romiluz:H97r3aQBnxWawZbx@aibrain2js.rhcftey.mongodb.net/?retryWrites=true&w=majority&appName=aibrain2js"
    echo "OPENAI_API_KEY=your_openai_key_here"
    echo "VOYAGE_API_KEY=pa-NHB7D_EtgEImAVQkjIZ6PxoGVHcTOQvUujwDeq8m9-Q"
    echo ""
else
    echo "✅ .env file found"
fi

echo ""
echo "🚀 Setup complete! Ready to test cognitive systems."
echo ""
echo "Quick start:"
echo "  npm run test:memory    # Test memory systems"
echo "  npm run test:all       # Test all 24 systems"
echo ""
echo "Or run individual test:"
echo "  node src/run-memory-tests.js"
echo ""
