#!/bin/bash

# SceneScout Production Setup - Day 2 Focus
# Vercel deployment, CI/CD, and production configurations

set -e

echo "☁️  SceneScout Production Setup"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check for Vercel CLI
setup_vercel() {
    log_info "Setting up Vercel deployment..."
    
    if ! command -v vercel &> /dev/null; then
        log_info "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Create vercel.json configuration
    cat > vercel.json << 'EOF'
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_SENTRY_DSN": "@sentry_dsn",
    "VITE_GA_MEASUREMENT_ID": "@ga_measurement_id"
  },
  "build": {
    "env": {
      "VITE_SUPABASE_URL": "@supabase_url",
      "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
    }
  },
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.com https://api.eventbrite.com https://app.ticketmaster.com https://sentry.io;"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/api/:path*",
      "destination": "https://your-project.supabase.co/rest/v1/:path*",
      "permanent": false
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
EOF

    log_success "Vercel configuration created"
}

# Create GitHub Actions workflow
setup_github_actions() {
    log_info "Setting up GitHub Actions CI/CD..."
    
    mkdir -p .github/workflows
    
    cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Type check
        run: npm run typecheck
        
      - name: Lint
        run: npm run lint
        
      - name: Test
        run: npm run test
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}

  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: test
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }} > deployment-url.txt
        
      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const deploymentUrl = fs.readFileSync('deployment-url.txt', 'utf8').trim();
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview deployment ready: ${deploymentUrl}`
            });

  deploy-production:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: test
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
        
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        
      - name: Run database migrations
        run: |
          npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
  performance-test:
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Audit URLs using Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://scenescout.vercel.app
            https://scenescout.vercel.app/discover
            https://scenescout.vercel.app/map
          uploadArtifacts: true
          temporaryPublicStorage: true
EOF

    # Create workflow for database operations
    cat > .github/workflows/database.yml << 'EOF'
name: Database Operations

on:
  workflow_dispatch:
    inputs:
      operation:
        description: 'Database operation'
        required: true
        default: 'push'
        type: choice
        options:
        - push
        - reset
        - seed
        - migrate

jobs:
  database:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install Supabase CLI
        run: npm install -g supabase
        
      - name: Link to Supabase project
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Run database operation
        run: |
          case "${{ github.event.inputs.operation }}" in
            "push")
              supabase db push
              ;;
            "reset")
              supabase db reset --linked
              ;;
            "seed")
              supabase seed
              ;;
            "migrate")
              supabase migration up
              ;;
          esac
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
EOF

    log_success "GitHub Actions workflows created"
}

# Create health check endpoint
create_health_check() {
    log_info "Creating health check endpoint..."
    
    mkdir -p src/pages/api
    
    cat > src/pages/api/health.ts << 'EOF'
export default function handler(req: any, res: any) {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  }

  try {
    res.status(200).json(healthcheck)
  } catch (error) {
    healthcheck.message = 'ERROR'
    res.status(503).json(healthcheck)
  }
}
EOF

    log_success "Health check endpoint created"
}

# Create monitoring dashboard
create_monitoring_config() {
    log_info "Creating monitoring configuration..."
    
    mkdir -p scripts/monitoring
    
    cat > scripts/monitoring/dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "SceneScout Production Monitoring",
    "tags": ["scenescout", "production"],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(http_request_duration_seconds)",
            "legendFormat": "Average Response Time"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status!~\"2..\"}[5m]))",
            "legendFormat": "Error Rate"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "supabase_db_connections_active",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "User Registrations",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(user_registrations_total[1h])",
            "legendFormat": "Registrations/Hour"
          }
        ]
      }
    ]
  }
}
EOF

    log_success "Monitoring configuration created"
}

# Create backup strategy
setup_backup_strategy() {
    log_info "Setting up backup strategy..."
    
    cat > scripts/backup-database.sh << 'EOF'
#!/bin/bash

# SceneScout Database Backup Script
# Runs daily via GitHub Actions or cron

set -e

BACKUP_DIR="/tmp/supabase-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="scenescout_backup_${DATE}.sql"

echo "🗄️  Starting database backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
supabase db dump --linked > "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Database backup completed: $BACKUP_FILE"

# Upload to cloud storage (implement based on your preference)
if [[ -n "$AWS_ACCESS_KEY_ID" ]]; then
    aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://scenescout-backups/"
    echo "☁️  Backup uploaded to S3"
fi

# Cleanup old local backups (keep last 3)
ls -t $BACKUP_DIR/*.sql | tail -n +4 | xargs -r rm

echo "🧹 Cleanup completed"
EOF

    chmod +x scripts/backup-database.sh
    
    # Create backup workflow
    cat > .github/workflows/backup.yml << 'EOF'
name: Daily Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Install Supabase CLI
        run: npm install -g supabase
        
      - name: Link to Supabase project
        run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          
      - name: Run backup
        run: ./scripts/backup-database.sh
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
EOF

    log_success "Backup strategy configured"
}

# Create deployment checklist
create_deployment_checklist() {
    log_info "Creating deployment checklist..."
    
    cat > DEPLOYMENT_CHECKLIST.md << 'EOF'
# 🚀 SceneScout Production Deployment Checklist

## Pre-Deployment (Complete before going live)

### Environment Setup
- [ ] Production Supabase project created
- [ ] Database schema deployed (`supabase db push`)
- [ ] Environment variables configured in Vercel
- [ ] DNS configured for custom domain
- [ ] SSL certificate verified

### External Services
- [ ] Eventbrite API token configured and tested
- [ ] Ticketmaster API key configured and tested  
- [ ] Sentry error tracking configured
- [ ] Google Analytics configured (optional)
- [ ] Stripe configured for payments (when ready)

### Security
- [ ] All API keys stored as secrets (not in code)
- [ ] Row Level Security policies tested
- [ ] CORS configuration verified
- [ ] Security headers configured in Vercel
- [ ] Rate limiting implemented

### Performance
- [ ] Database queries optimized
- [ ] Images optimized and CDN configured
- [ ] Bundle size analyzed and optimized
- [ ] Lighthouse scores > 90 for key pages
- [ ] Error boundaries implemented

### Testing
- [ ] All authentication flows tested
- [ ] Payment flows tested (if applicable)
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility tested
- [ ] Performance testing completed

## Post-Deployment (Complete after going live)

### Monitoring
- [ ] Error tracking alerts configured
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Database backup schedule verified

### User Experience
- [ ] User registration flow tested
- [ ] Event discovery working with real data
- [ ] Maps functionality verified
- [ ] Search performance acceptable

### Business Metrics
- [ ] Analytics tracking implemented
- [ ] Conversion funnels configured
- [ ] User feedback collection active
- [ ] A/B testing framework ready

## Rollback Plan

If critical issues are discovered:

1. **Quick Fix**: Hotfix deployment via Vercel
2. **Partial Rollback**: Revert specific features via feature flags
3. **Full Rollback**: Revert to previous Git commit and redeploy
4. **Database Issues**: Restore from latest backup

## Success Criteria

- [ ] **Uptime**: >99% in first week
- [ ] **Performance**: <2s page load time
- [ ] **Errors**: <0.1% error rate
- [ ] **User Flow**: Registration to first event save <5 minutes
- [ ] **Data Quality**: >1000 real events loaded and discoverable

## Emergency Contacts

- **Technical Issues**: [Your Email]
- **Supabase Issues**: Create support ticket at support.supabase.com
- **Vercel Issues**: Create support ticket at vercel.com/support
- **Domain Issues**: Contact your DNS provider

---

**Deployment Date**: _________________
**Deployed By**: _________________
**Version**: _________________
**Git Commit**: _________________
EOF

    log_success "Deployment checklist created"
}

# Main execution
main() {
    echo ""
    log_info "Setting up production infrastructure..."
    
    setup_vercel
    setup_github_actions
    create_health_check
    create_monitoring_config
    setup_backup_strategy
    create_deployment_checklist
    
    echo ""
    log_success "🎉 Production setup completed!"
    echo ""
    echo "=========================================="
    echo "📋 MANUAL STEPS TO COMPLETE DEPLOYMENT:"
    echo "=========================================="
    echo ""
    echo "1. 🔗 Initialize Vercel project:"
    echo "   vercel login"
    echo "   vercel link"
    echo ""
    echo "2. ⚙️  Add environment variables to Vercel:"
    echo "   vercel env add VITE_SUPABASE_URL"
    echo "   vercel env add VITE_SUPABASE_ANON_KEY"
    echo ""
    echo "3. 🔧 Configure GitHub repository secrets:"
    echo "   VERCEL_ORG_ID (from vercel.json)"
    echo "   VERCEL_PROJECT_ID (from vercel.json)" 
    echo "   VERCEL_TOKEN (from Vercel settings)"
    echo "   SUPABASE_ACCESS_TOKEN (from Supabase dashboard)"
    echo "   SUPABASE_PROJECT_REF (your project reference)"
    echo ""
    echo "4. 🚀 Deploy to production:"
    echo "   git add . && git commit -m \"Production setup\""
    echo "   git push origin main"
    echo ""
    echo "5. ✅ Verify deployment:"
    echo "   curl https://your-domain.vercel.app/api/health"
    echo ""
    echo "=========================================="
    echo "🎯 NEXT: Complete Week 1 tasks and begin Week 2"
    echo "=========================================="
}

main "$@"