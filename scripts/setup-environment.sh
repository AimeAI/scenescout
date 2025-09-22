#!/bin/bash

# ========================================
# SceneScout Environment Setup Script
# Configures environment variables for different environments
# ========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
SUPABASE_DIR="$PROJECT_ROOT/supabase"
CONFIG_DIR="$PROJECT_ROOT/config"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SceneScout Environment Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random string
generate_random_string() {
    local length=${1:-32}
    openssl rand -hex $length 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w $length | head -n 1
}

# Function to check required tools
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command_exists "node"; then
        missing_deps+=("node")
    fi
    
    if ! command_exists "npm"; then
        missing_deps+=("npm")
    fi
    
    if ! command_exists "supabase"; then
        missing_deps+=("supabase CLI")
    fi
    
    if ! command_exists "openssl"; then
        missing_deps+=("openssl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_error "Please install missing dependencies and run this script again."
        exit 1
    fi
    
    print_status "All dependencies found"
}

# Function to create .env file from template
create_env_file() {
    print_status "Creating environment file..."
    
    if [ -f "$ENV_FILE" ]; then
        print_warning ".env file already exists"
        read -p "Do you want to backup and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
            print_status "Backed up existing .env file"
        else
            print_status "Keeping existing .env file"
            return 0
        fi
    fi
    
    if [ ! -f "$ENV_EXAMPLE" ]; then
        print_error ".env.example file not found"
        exit 1
    fi
    
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    print_status "Created .env file from template"
}

# Function to generate secrets
generate_secrets() {
    print_status "Generating secure secrets..."
    
    local jwt_secret=$(generate_random_string 32)
    local webhook_secret=$(generate_random_string 24)
    local encryption_key=$(generate_random_string 32)
    local session_secret=$(generate_random_string 24)
    
    # Update secrets in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/JWT_SECRET=your_jwt_secret_key/JWT_SECRET=$jwt_secret/" "$ENV_FILE"
        sed -i '' "s/WEBHOOK_SECRET=your_webhook_secret/WEBHOOK_SECRET=$webhook_secret/" "$ENV_FILE"
        sed -i '' "s/ENCRYPTION_KEY=your_encryption_key/ENCRYPTION_KEY=$encryption_key/" "$ENV_FILE"
        sed -i '' "s/SESSION_SECRET=your_session_secret/SESSION_SECRET=$session_secret/" "$ENV_FILE"
    else
        # Linux
        sed -i "s/JWT_SECRET=your_jwt_secret_key/JWT_SECRET=$jwt_secret/" "$ENV_FILE"
        sed -i "s/WEBHOOK_SECRET=your_webhook_secret/WEBHOOK_SECRET=$webhook_secret/" "$ENV_FILE"
        sed -i "s/ENCRYPTION_KEY=your_encryption_key/ENCRYPTION_KEY=$encryption_key/" "$ENV_FILE"
        sed -i "s/SESSION_SECRET=your_session_secret/SESSION_SECRET=$session_secret/" "$ENV_FILE"
    fi
    
    print_status "Generated secure secrets"
}

# Function to generate VAPID keys
generate_vapid_keys() {
    print_status "Generating VAPID keys for push notifications..."
    
    if command_exists "npx"; then
        local vapid_output
        vapid_output=$(npx web-push generate-vapid-keys --json 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            local public_key
            local private_key
            
            # Extract keys from JSON output
            public_key=$(echo "$vapid_output" | grep -o '"publicKey":"[^"]*"' | cut -d'"' -f4)
            private_key=$(echo "$vapid_output" | grep -o '"privateKey":"[^"]*"' | cut -d'"' -f4)
            
            if [ -n "$public_key" ] && [ -n "$private_key" ]; then
                # Update VAPID keys in .env file
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    sed -i '' "s/VAPID_PUBLIC_KEY=your_vapid_public_key/VAPID_PUBLIC_KEY=$public_key/" "$ENV_FILE"
                    sed -i '' "s/VAPID_PRIVATE_KEY=your_vapid_private_key/VAPID_PRIVATE_KEY=$private_key/" "$ENV_FILE"
                    sed -i '' "s/NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key/NEXT_PUBLIC_VAPID_PUBLIC_KEY=$public_key/" "$ENV_FILE"
                else
                    sed -i "s/VAPID_PUBLIC_KEY=your_vapid_public_key/VAPID_PUBLIC_KEY=$public_key/" "$ENV_FILE"
                    sed -i "s/VAPID_PRIVATE_KEY=your_vapid_private_key/VAPID_PRIVATE_KEY=$private_key/" "$ENV_FILE"
                    sed -i "s/NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key/NEXT_PUBLIC_VAPID_PUBLIC_KEY=$public_key/" "$ENV_FILE"
                fi
                
                print_status "Generated VAPID keys for push notifications"
            else
                print_warning "Failed to parse VAPID keys"
            fi
        else
            print_warning "Failed to generate VAPID keys - install web-push: npm install -g web-push"
        fi
    else
        print_warning "npm not available - skipping VAPID key generation"
    fi
}

# Function to setup Supabase environment
setup_supabase_env() {
    print_status "Setting up Supabase environment..."
    
    if [ ! -f "$SUPABASE_DIR/config.toml" ]; then
        print_warning "Supabase not initialized. Run 'supabase init' first."
        return 1
    fi
    
    # Check if user is logged in to Supabase
    if ! supabase status >/dev/null 2>&1; then
        print_warning "Supabase project not linked. Please run 'supabase link' to connect to your project."
        print_status "You can get your project reference from: https://supabase.com/dashboard"
        return 1
    fi
    
    # Get Supabase project info
    local project_ref
    project_ref=$(supabase status --output json 2>/dev/null | grep -o '"ref":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$project_ref" ]; then
        local supabase_url="https://${project_ref}.supabase.co"
        
        # Update Supabase URL in .env
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|" "$ENV_FILE"
        else
            sed -i "s|NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|" "$ENV_FILE"
        fi
        
        print_status "Updated Supabase URL: $supabase_url"
        print_warning "You still need to set NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY"
        print_status "Get these from: https://supabase.com/dashboard/project/$project_ref/settings/api"
    fi
}

# Function to validate environment
validate_environment() {
    print_status "Validating environment configuration..."
    
    # Source the environment file
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a
    
    local validation_errors=()
    
    # Check required variables
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ "$NEXT_PUBLIC_SUPABASE_URL" = "https://your-project-id.supabase.co" ]; then
        validation_errors+=("NEXT_PUBLIC_SUPABASE_URL not set")
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" = "your_anon_key_here" ]; then
        validation_errors+=("NEXT_PUBLIC_SUPABASE_ANON_KEY not set")
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ "$SUPABASE_SERVICE_ROLE_KEY" = "your_service_role_key_here" ]; then
        validation_errors+=("SUPABASE_SERVICE_ROLE_KEY not set")
    fi
    
    # Check JWT secret length
    if [ ${#JWT_SECRET} -lt 32 ]; then
        validation_errors+=("JWT_SECRET should be at least 32 characters")
    fi
    
    if [ ${#validation_errors[@]} -eq 0 ]; then
        print_status "Environment validation passed"
        return 0
    else
        print_warning "Environment validation found issues:"
        for error in "${validation_errors[@]}"; do
            echo -e "  ${YELLOW}•${NC} $error"
        done
        return 1
    fi
}

# Function to create directories
create_directories() {
    print_status "Creating required directories..."
    
    local directories=(
        "$PROJECT_ROOT/logs"
        "$PROJECT_ROOT/cache"
        "$PROJECT_ROOT/uploads"
        "$PROJECT_ROOT/backups"
        "$CONFIG_DIR/venues"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_status "Created directory: $dir"
        fi
    done
    
    # Create .gitignore entries for sensitive directories
    {
        echo ""
        echo "# Environment and cache directories"
        echo "logs/"
        echo "cache/"
        echo "uploads/"
        echo "backups/"
        echo ".env"
        echo ".env.local"
        echo ".env.production"
    } >> "$PROJECT_ROOT/.gitignore" 2>/dev/null || true
}

# Function to setup API key validation script
create_api_validation_script() {
    print_status "Creating API key validation script..."
    
    cat > "$PROJECT_ROOT/scripts/validate-api-keys.js" << 'EOF'
#!/usr/bin/env node

const https = require('https');
const http = require('http');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = (color, message) => console.log(`${color}${message}${colors.reset}`);
const success = (msg) => log(colors.green, `✓ ${msg}`);
const error = (msg) => log(colors.red, `✗ ${msg}`);
const warning = (msg) => log(colors.yellow, `⚠ ${msg}`);
const info = (msg) => log(colors.blue, `ℹ ${msg}`);

// API validation tests
const validations = [
  {
    name: 'Supabase Connection',
    test: async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        throw new Error('Supabase URL or anon key not configured');
      }
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: url.replace('https://', ''),
          path: '/rest/v1/',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        };
        
        const req = https.request(options, (res) => {
          if (res.statusCode === 200) {
            resolve('Supabase connection successful');
          } else {
            reject(new Error(`Supabase returned status ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
        req.end();
      });
    }
  },
  {
    name: 'Eventbrite API',
    test: async () => {
      const token = process.env.EVENTBRITE_TOKEN;
      if (!token) {
        throw new Error('Eventbrite token not configured');
      }
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.eventbriteapi.com',
          path: '/v3/users/me/',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const req = https.request(options, (res) => {
          if (res.statusCode === 200) {
            resolve('Eventbrite API key valid');
          } else {
            reject(new Error(`Eventbrite API returned status ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
        req.end();
      });
    }
  },
  {
    name: 'Google Places API',
    test: async () => {
      const key = process.env.GOOGLE_PLACES_API_KEY;
      if (!key) {
        throw new Error('Google Places API key not configured');
      }
      
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'maps.googleapis.com',
          path: `/maps/api/place/findplacefromtext/json?input=restaurant&inputtype=textquery&key=${key}`
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              if (result.status === 'OK' || result.status === 'ZERO_RESULTS') {
                resolve('Google Places API key valid');
              } else {
                reject(new Error(`Google Places API error: ${result.status}`));
              }
            } catch (e) {
              reject(new Error('Invalid response from Google Places API'));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
        req.end();
      });
    }
  }
];

// Run validations
async function runValidations() {
  info('Validating API keys and services...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const validation of validations) {
    try {
      const result = await validation.test();
      success(`${validation.name}: ${result}`);
      passed++;
    } catch (err) {
      error(`${validation.name}: ${err.message}`);
      failed++;
    }
  }
  
  console.log('');
  info(`Validation complete: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    warning('Some validations failed. Check your environment configuration.');
    process.exit(1);
  } else {
    success('All validations passed!');
  }
}

runValidations().catch(err => {
  error(`Validation script error: ${err.message}`);
  process.exit(1);
});
EOF

    chmod +x "$PROJECT_ROOT/scripts/validate-api-keys.js"
    print_status "Created API validation script"
}

# Function to display next steps
show_next_steps() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Environment Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo -e "1. ${BLUE}Configure API Keys:${NC}"
    echo -e "   • Edit .env file and add your API keys"
    echo -e "   • Get Supabase keys from: https://supabase.com/dashboard"
    echo -e "   • Get API keys from respective service providers"
    
    echo -e "\n2. ${BLUE}Validate Configuration:${NC}"
    echo -e "   npm run validate-api-keys"
    
    echo -e "\n3. ${BLUE}Setup Supabase:${NC}"
    echo -e "   supabase db reset"
    echo -e "   supabase functions deploy"
    
    echo -e "\n4. ${BLUE}Start Development:${NC}"
    echo -e "   npm run dev"
    
    echo -e "\n${YELLOW}Important Files:${NC}"
    echo -e "• ${BLUE}.env${NC} - Your environment variables"
    echo -e "• ${BLUE}.env.example${NC} - Template with all available variables"
    echo -e "• ${BLUE}config/environment.production.example${NC} - Production template"
    echo -e "• ${BLUE}scripts/validate-api-keys.js${NC} - API validation script"
    
    echo -e "\n${RED}Security Notes:${NC}"
    echo -e "• Never commit .env files to version control"
    echo -e "• Use environment-specific configurations"
    echo -e "• Rotate secrets regularly in production"
    echo -e "• Enable 2FA on all service accounts"
}

# Main execution
main() {
    case "${1:-setup}" in
        "check")
            check_dependencies
            ;;
        "secrets")
            generate_secrets
            generate_vapid_keys
            ;;
        "validate")
            validate_environment
            ;;
        "supabase")
            setup_supabase_env
            ;;
        "clean")
            rm -f "$ENV_FILE"
            print_status "Removed .env file"
            ;;
        "setup"|*)
            check_dependencies
            create_directories
            create_env_file
            generate_secrets
            generate_vapid_keys
            setup_supabase_env
            create_api_validation_script
            
            if validate_environment; then
                show_next_steps
            else
                print_warning "Setup completed with validation warnings"
                print_status "Please review and fix the issues mentioned above"
            fi
            ;;
    esac
}

# Handle script arguments
if [ $# -eq 0 ]; then
    main setup
else
    main "$1"
fi