#!/bin/bash

# SceneScout v14 - GitHub Push Script
# Replace REPO_NAME with your actual repository name

REPO_NAME="scenescout-v14"  # Change this if you used a different name
GITHUB_USERNAME="AimeAI"

echo "🚀 Pushing SceneScout v14 to GitHub..."
echo "Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""

# Add remote origin
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Push to GitHub
git push -u origin main

echo ""
echo "✅ Push complete!"
echo "🔗 View your repository at: https://github.com/$GITHUB_USERNAME/$REPO_NAME"