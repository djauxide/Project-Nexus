#!/usr/bin/env bash
set -euo pipefail

echo "Setting up NEXUS v4 development environment..."

# Copy env
[ -f .env ] || cp .env.example .env && echo "Created .env — edit with your values"

# Make scripts executable
chmod +x scripts/*.sh

# Check dependencies
for cmd in docker docker-compose node go python3; do
  command -v "$cmd" &>/dev/null && echo "  ✓ $cmd" || echo "  ✗ $cmd (not found)"
done

echo ""
echo "Run 'make dev' to start the development stack."
echo "Run 'make test' to run all tests."
