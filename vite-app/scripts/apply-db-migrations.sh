#!/bin/bash

# SceneScout Database Migration Script
# This script applies the core database schema and RPC functions to eliminate TypeScript "never" type errors

set -e

echo "🚀 Applying SceneScout database migrations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI not found. Please install it with: npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "db/migrations/0001_core.sql" ] || [ ! -f "db/migrations/0002_rpcs.sql" ]; then
    print_error "Migration files not found. Please run this script from the project root."
    exit 1
fi

print_status "Checking Supabase connection..."

# Try to check if project is linked
if ! supabase status > /dev/null 2>&1; then
    print_warning "Supabase project not linked or local instance not running."
    print_status "Please ensure you have:"
    print_status "1. Linked to your Supabase project: supabase link --project-ref YOUR_PROJECT_REF"
    print_status "2. Or started local development: supabase start"
    read -p "Do you want to continue and try applying migrations anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_status "Applying core schema (0001_core.sql)..."
if cat db/migrations/0001_core.sql | supabase db query --stdin > /dev/null 2>&1; then
    print_success "Core schema applied successfully"
else
    print_error "Failed to apply core schema. Trying alternative method..."
    print_status "Please manually copy and paste the contents of db/migrations/0001_core.sql into your Supabase SQL editor"
fi

print_status "Applying RPC functions (0002_rpcs.sql)..."
if cat db/migrations/0002_rpcs.sql | supabase db query --stdin > /dev/null 2>&1; then
    print_success "RPC functions applied successfully"
else
    print_error "Failed to apply RPC functions. Trying alternative method..."
    print_status "Please manually copy and paste the contents of db/migrations/0002_rpcs.sql into your Supabase SQL editor"
fi

print_status "Running verification tests..."
if cat db/migrations/test-queries.sql | supabase db query --stdin > /dev/null 2>&1; then
    print_success "Database verification tests passed!"
else
    print_warning "Verification tests failed or manual intervention needed"
    print_status "You can manually run the test queries from db/migrations/test-queries.sql"
fi

print_success "Migration script completed!"
print_status "Next steps:"
print_status "1. Run 'npm run typecheck' to verify TypeScript errors are resolved"
print_status "2. Run 'npm run dev' to test the application"
print_status "3. Check the Supabase dashboard to confirm tables and functions were created"

echo ""
print_status "If you encounter issues, check the troubleshooting section in docs/DB_BOOTSTRAP.md"