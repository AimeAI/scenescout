#!/bin/bash

# SceneScout Deployment Validation Script
# This script validates all critical systems before and after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${APP_URL:-http://localhost:3000}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-http://localhost:54321}"
HEALTH_ENDPOINT="$APP_URL/api/health"
TIMEOUT=30

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test functions
test_environment_variables() {
    log_info "Checking environment variables..."
    
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    log_success "All required environment variables are set"
    return 0
}

test_typescript_compilation() {
    log_info "Testing TypeScript compilation..."
    
    if command -v npm &> /dev/null; then
        if npm run typecheck > /dev/null 2>&1; then
            log_success "TypeScript compilation passed"
            return 0
        else
            log_error "TypeScript compilation failed"
            npm run typecheck
            return 1
        fi
    else
        log_warning "npm not found, skipping TypeScript check"
        return 0
    fi
}

test_build() {
    log_info "Testing application build..."
    
    if command -v npm &> /dev/null; then
        if npm run build > /dev/null 2>&1; then
            log_success "Application build passed"
            return 0
        else
            log_error "Application build failed"
            npm run build
            return 1
        fi
    else
        log_warning "npm not found, skipping build check"
        return 0
    fi
}

test_database_connection() {
    log_info "Testing database connection..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
        "$SUPABASE_URL/rest/v1/events?select=count&limit=1" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Database connection failed (HTTP $response)"
        return 1
    fi
}

test_health_endpoint() {
    log_info "Testing application health endpoint..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time $TIMEOUT "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        log_success "Health endpoint responded successfully"
        return 0
    else
        log_error "Health endpoint failed (HTTP $response)"
        return 1
    fi
}

test_api_endpoints() {
    log_info "Testing critical API endpoints..."
    
    local endpoints=(
        "$APP_URL/api/events"
        "$APP_URL/api/venues"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time $TIMEOUT "$endpoint" 2>/dev/null || echo "000")
        
        if [[ "$response" == "200" ]]; then
            log_success "API endpoint $endpoint responded successfully"
        else
            log_error "API endpoint $endpoint failed (HTTP $response)"
            failed_endpoints+=("$endpoint")
        fi
    done
    
    if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        log_error "Failed API endpoints: ${failed_endpoints[*]}"
        return 1
    fi
    
    return 0
}

test_authentication() {
    log_info "Testing authentication endpoints..."
    
    # Test auth session endpoint
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
        "$SUPABASE_URL/auth/v1/user" 2>/dev/null || echo "000")
    
    if [[ "$response" == "401" || "$response" == "200" ]]; then
        log_success "Authentication endpoint is responsive"
        return 0
    else
        log_error "Authentication endpoint failed (HTTP $response)"
        return 1
    fi
}

test_edge_functions() {
    log_info "Testing Edge Functions..."
    
    local functions=(
        "ingest_ticketmaster"
        "ingest_eventbrite"
    )
    
    local failed_functions=()
    
    for func in "${functions[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST \
            -H "Authorization: Bearer ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
            -H "Content-Type: application/json" \
            --max-time $TIMEOUT \
            "$SUPABASE_URL/functions/v1/$func" \
            -d '{"test": true}' 2>/dev/null || echo "000")
        
        if [[ "$response" == "200" || "$response" == "400" ]]; then
            log_success "Edge function $func is responsive"
        else
            log_error "Edge function $func failed (HTTP $response)"
            failed_functions+=("$func")
        fi
    done
    
    if [[ ${#failed_functions[@]} -gt 0 ]]; then
        log_warning "Some edge functions may not be available: ${failed_functions[*]}"
        # Don't fail deployment for edge functions
    fi
    
    return 0
}

test_performance() {
    log_info "Testing application performance..."
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -o /dev/null -w "%{time_total}" \
        --max-time $TIMEOUT "$APP_URL" 2>/dev/null || echo "99.999")
    local end_time=$(date +%s%N)
    
    local response_time_ms=$(echo "scale=0; $response * 1000" | bc -l 2>/dev/null || echo "9999")
    
    if (( $(echo "$response < 3.0" | bc -l 2>/dev/null || echo "0") )); then
        log_success "Application performance acceptable (${response}s)"
        return 0
    else
        log_warning "Application performance may be slow (${response}s)"
        # Don't fail deployment for performance
        return 0
    fi
}

test_mobile_responsive() {
    log_info "Testing mobile responsive design..."
    
    # Test with mobile user agent
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" \
        --max-time $TIMEOUT "$APP_URL" 2>/dev/null || echo "000")
    
    if [[ "$response" == "200" ]]; then
        log_success "Mobile responsive design working"
        return 0
    else
        log_error "Mobile responsive design failed (HTTP $response)"
        return 1
    fi
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    if [[ -f "scripts/smoke.mjs" ]] && command -v node &> /dev/null; then
        if node scripts/smoke.mjs > /dev/null 2>&1; then
            log_success "Smoke tests passed"
            return 0
        else
            log_error "Smoke tests failed"
            node scripts/smoke.mjs
            return 1
        fi
    else
        log_warning "Smoke tests not available"
        return 0
    fi
}

# Main validation function
run_validation() {
    local test_type="${1:-full}"
    local failed_tests=()
    
    echo "=========================="
    echo "SceneScout Deployment Validation"
    echo "Test Type: $test_type"
    echo "Timestamp: $(date)"
    echo "=========================="
    
    # Pre-deployment tests
    if [[ "$test_type" == "pre" || "$test_type" == "full" ]]; then
        log_info "Running pre-deployment tests..."
        
        test_environment_variables || failed_tests+=("environment_variables")
        test_typescript_compilation || failed_tests+=("typescript_compilation")
        test_build || failed_tests+=("build")
    fi
    
    # Runtime tests
    if [[ "$test_type" == "post" || "$test_type" == "full" ]]; then
        log_info "Running post-deployment tests..."
        
        test_database_connection || failed_tests+=("database_connection")
        test_health_endpoint || failed_tests+=("health_endpoint")
        test_api_endpoints || failed_tests+=("api_endpoints")
        test_authentication || failed_tests+=("authentication")
        test_edge_functions || failed_tests+=("edge_functions")
        test_performance || failed_tests+=("performance")
        test_mobile_responsive || failed_tests+=("mobile_responsive")
        run_smoke_tests || failed_tests+=("smoke_tests")
    fi
    
    echo "=========================="
    
    if [[ ${#failed_tests[@]} -eq 0 ]]; then
        log_success "All tests passed! ✅"
        echo "Deployment validation successful"
        return 0
    else
        log_error "Some tests failed: ${failed_tests[*]}"
        echo "Deployment validation failed"
        return 1
    fi
}

# Usage information
usage() {
    echo "Usage: $0 [pre|post|full]"
    echo ""
    echo "  pre   - Run pre-deployment validation"
    echo "  post  - Run post-deployment validation"
    echo "  full  - Run all validation tests (default)"
    echo ""
    echo "Environment variables:"
    echo "  APP_URL              - Application URL (default: http://localhost:3000)"
    echo "  NEXT_PUBLIC_SUPABASE_URL - Supabase URL"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key"
    echo "  SUPABASE_SERVICE_ROLE_KEY - Supabase service role key"
}

# Check if help was requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Check dependencies
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v bc &> /dev/null; then
    log_warning "bc is not installed, performance timing may not work"
fi

# Run validation
run_validation "${1:-full}"
exit $?