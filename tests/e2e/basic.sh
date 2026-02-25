#!/bin/bash
# E2E test script for git-workflow-manager
# Tests the CLI end-to-end in an isolated environment

set -e

echo "=== Git Workflow Manager E2E Tests ==="

# Create test directory
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

echo "Test directory: $TEST_DIR"

# Initialize git repo
git init
git config user.email "test@test.com"
git config user.name "Test User"

# Create initial commit
echo "initial" > file.txt
git add file.txt
git commit -m "initial commit"

# Install git-workflow-manager
echo "Installing git-workflow-manager..."
cd /app
npm link

# Test init command (auto-detect)
cd "$TEST_DIR"
echo "Testing 'git-workflow init'..."
git-workflow init

# Test branch creation
echo "Testing 'git-workflow create'..."
git-workflow create feat/test-feature

# Test branch exists
if git branch | grep -q "feat/test-feature"; then
  echo "✓ Branch created successfully"
else
  echo "✗ Branch creation failed"
  exit 1
fi

# Test config was created
if [ -f ".git/workflow-config.json" ]; then
  echo "✓ Config file created"
else
  echo "✗ Config file not found"
  exit 1
fi

# Test sync commands exist
echo "Testing sync commands..."
git-workflow sync staging 2>&1 || true

# Test status command
echo "Testing 'git-workflow status'..."
git-workflow status 2>&1 || true

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo "=== E2E Tests Complete ==="
