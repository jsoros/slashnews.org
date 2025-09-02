#!/bin/bash

# Script to simulate GitHub Actions environment locally
# This helps identify CI-specific issues before pushing

echo "🔄 Simulating GitHub Actions Environment"
echo "========================================"

# Set CI environment variables
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
export CI=true
export VITEST=true

echo "=== Environment Information ==="
node --version
npm --version
echo "NODE_OPTIONS: $NODE_OPTIONS"
echo "CI: $CI"  
echo "VITEST: $VITEST"
echo ""

echo "=== Dependency Verification ==="
npm ls --depth=0 || echo "Dependency issues detected"
echo ""

echo "=== TypeScript Version ==="
npx tsc --version
echo ""

echo "🔧 Running CI Build Steps..."
echo "============================="

# Step 1: Lint
echo "1️⃣ Running Lint..."
npm run lint
LINT_EXIT=$?
if [ $LINT_EXIT -ne 0 ]; then
    echo "❌ Lint failed!"
    exit $LINT_EXIT
fi
echo "✅ Lint passed"
echo ""

# Step 2: Build
echo "2️⃣ Running Build..."
npm run build
BUILD_EXIT=$?
if [ $BUILD_EXIT -ne 0 ]; then
    echo "❌ Build failed!"
    exit $BUILD_EXIT
fi
echo "✅ Build passed"
echo ""

# Step 3: Tests (with memory monitoring)
echo "3️⃣ Running Tests..."
echo "Memory before tests:"
if command -v free &> /dev/null; then
    free -h
else
    echo "(free command not available on macOS)"
fi

npm run test:run
TEST_EXIT=$?

echo "Memory after tests:"
if command -v free &> /dev/null; then
    free -h
else
    echo "(free command not available on macOS)"
fi

if [ $TEST_EXIT -ne 0 ]; then
    echo "❌ Tests failed!"
    exit $TEST_EXIT
fi
echo "✅ Tests passed"
echo ""

echo "🎉 All CI steps passed locally!"
echo "Ready for GitHub Actions deployment."