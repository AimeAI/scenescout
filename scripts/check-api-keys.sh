#!/bin/bash

# API Key Security Check Script
# This script checks for exposed API keys in the codebase

echo "🔍 Checking for exposed API keys..."
echo "===================================="
echo ""

# Common API key patterns to search for
PATTERNS=(
    "AIzaSy[a-zA-Z0-9-_]{33}"  # Google API keys
    "sk_live_[a-zA-Z0-9]{24}"  # Stripe live keys
    "sk_test_[a-zA-Z0-9]{24}"  # Stripe test keys
    "Bearer [a-zA-Z0-9-_]{20,}"  # Generic Bearer tokens
    "api_key.*=.*['\"][a-zA-Z0-9-_]{20,}['\"]"  # Generic API key assignments
)

# Files to exclude from search
EXCLUDE_PATTERNS=(
    "*.env*"
    "*.git*"
    "node_modules"
    ".next"
    "dist"
    "*.md"
    "check-api-keys.sh"
)

# Build exclude arguments for rg
EXCLUDE_ARGS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --glob '!$pattern'"
done

# Check for each pattern
FOUND_KEYS=0
for pattern in "${PATTERNS[@]}"; do
    echo "Checking for pattern: $pattern"
    
    # Use ripgrep to search, excluding common safe patterns
    results=$(eval "rg -i '$pattern' . $EXCLUDE_ARGS 2>/dev/null || true")
    
    if [ -n "$results" ]; then
        echo "❌ Found potential API keys:"
        echo "$results"
        echo ""
        FOUND_KEYS=$((FOUND_KEYS + 1))
    else
        echo "✅ No keys found for this pattern"
    fi
    echo ""
done

# Check for hardcoded API endpoints with keys
echo "Checking for hardcoded API endpoints with keys..."
eval "rg -i 'api_key=|apikey=|key=' . $EXCLUDE_ARGS | grep -E '[a-zA-Z0-9]{20,}' || true"
echo ""

# Summary
echo "===================================="
if [ $FOUND_KEYS -eq 0 ]; then
    echo "✅ No exposed API keys found!"
    echo ""
    echo "Remember to:"
    echo "1. Always use environment variables for API keys"
    echo "2. Add .env files to .gitignore"
    echo "3. Use Supabase secrets for edge functions"
    echo "4. Restrict API keys in provider dashboards"
else
    echo "❌ Found $FOUND_KEYS potential API key exposures!"
    echo ""
    echo "Action required:"
    echo "1. Remove exposed keys from code"
    echo "2. Rotate any exposed keys immediately"
    echo "3. Move keys to environment variables"
    echo "4. Update .gitignore if needed"
fi

exit $FOUND_KEYS