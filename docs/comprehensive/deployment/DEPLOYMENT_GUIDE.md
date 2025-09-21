# SceneScout Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the SceneScout swarm system across different environments. The system supports multiple deployment strategies from local development to production cloud infrastructure.

## Prerequisites

### System Requirements

- **Node.js**: >=18.0.0
- **npm**: >=8.0.0 or **yarn**: >=1.22.0
- **Git**: Latest version
- **Operating System**: macOS, Linux, or Windows
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Minimum 10GB available space

### Development Tools

- **IDE**: VS Code, WebStorm, or similar
- **Database Client**: Optional (pgAdmin, DBeaver)
- **API Client**: Postman, Insomnia, or similar
- **Docker**: Optional for containerized deployment

### Required Accounts

- **GitHub**: For code repository access
- **Supabase**: For database and backend services
- **Vercel**: For production frontend deployment (recommended)
- **Stripe**: For payment processing (if enabled)

## Environment Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/scenescout.git
cd scenescout

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 2. Environment Variables

Configure the following environment variables in `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database Configuration
DATABASE_URL=your_postgresql_connection_string

# External API Keys
EVENTBRITE_API_KEY=your_eventbrite_key
TICKETMASTER_API_KEY=your_ticketmaster_key
MEETUP_API_KEY=your_meetup_key
YELP_API_KEY=your_yelp_key

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Claude Flow Configuration
CLAUDE_FLOW_ENABLED=true
CLAUDE_FLOW_TOPOLOGY=hierarchical
CLAUDE_FLOW_MAX_AGENTS=11

# Monitoring Configuration
ENABLE_MONITORING=true
MONITORING_INTERVAL=5000

# Security
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Database Setup

#### Using Supabase (Recommended)

1. Create a new Supabase project
2. Copy the project URL and anon key
3. Run database migrations:

```bash
# Apply schema migrations
npm run db:apply

# Deploy edge functions
npm run edge:deploy
```

#### Using Local PostgreSQL

```bash
# Start PostgreSQL service
sudo service postgresql start

# Create database
createdb scenescout

# Run migrations
psql -d scenescout -f db/SCHEMA.sql
psql -d scenescout -f db/SEED.sql
```

## Development Deployment

### Local Development Server

```bash
# Start development server
npm run dev

# The application will be available at:
# http://localhost:3000
```

### Development with Docker

```bash
# Build development container
docker build -t scenescout-dev -f Dockerfile.dev .

# Run with docker-compose
docker-compose -f docker-compose.dev.yml up
```

### Claude Flow Integration

```bash
# Install Claude Flow CLI
npm install -g claude-flow@alpha

# Initialize swarm coordination
npx claude-flow@alpha swarm init --topology hierarchical --max-agents 11

# Start agent coordination
npx claude-flow@alpha hooks pre-task --description "Development setup"
```

## Staging Deployment

### Vercel Staging

1. **Connect Repository**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Login and connect project
   vercel login
   vercel --prod=false
   ```

2. **Configure Environment Variables**:
   - Go to Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add all required environment variables
   - Set staging-specific values

3. **Deploy**:
   ```bash
   # Deploy to staging
   vercel --prod=false
   ```

### Supabase Staging

1. **Create Staging Project**:
   - Create a new Supabase project for staging
   - Configure database with staging data
   - Update environment variables

2. **Deploy Functions**:
   ```bash
   # Deploy to staging environment
   supabase functions deploy --project-ref your-staging-ref
   ```

### Testing Deployment

```bash
# Run comprehensive tests
npm test

# Run end-to-end tests
npm run test:e2e

# Run integration tests
npm run test:integration

# Performance tests
npm run test:performance
```

## Production Deployment

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Monitoring configured
- [ ] Backup procedures in place
- [ ] SSL certificates configured
- [ ] CDN configured (if applicable)
- [ ] Error tracking configured

### Production Environment Variables

```bash
# Production Database
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_prod_service_key

# API Rate Limits
API_RATE_LIMIT=1000
API_BURST_LIMIT=100

# Caching
REDIS_URL=your_redis_connection_string
CACHE_TTL=300

# Monitoring
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CDN_URL=your_cdn_url
```

### Vercel Production Deployment

1. **Production Build**:
   ```bash
   # Build and test locally
   npm run build
   npm start
   ```

2. **Deploy to Production**:
   ```bash
   # Deploy to production
   vercel --prod
   
   # Assign custom domain
   vercel domains add your-domain.com
   ```

3. **Post-deployment Verification**:
   ```bash
   # Health check
   curl https://your-domain.com/api/health
   
   # Performance check
   npm run test:performance:prod
   ```

### Supabase Production

1. **Production Database Setup**:
   ```bash
   # Apply production migrations
   supabase db push --project-ref your-prod-ref
   
   # Deploy edge functions
   supabase functions deploy --project-ref your-prod-ref
   ```

2. **Configure Row Level Security**:
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE events ENABLE ROW LEVEL SECURITY;
   ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```

3. **Set up Backups**:
   - Configure automated daily backups
   - Set up point-in-time recovery
   - Test restore procedures

### Domain and SSL Configuration

1. **DNS Configuration**:
   ```
   # Add DNS records
   A record: your-domain.com -> Vercel IP
   CNAME: www -> your-domain.com
   ```

2. **SSL Certificate**:
   - Vercel automatically provides SSL
   - Verify certificate installation
   - Test HTTPS redirect

### CDN Configuration

1. **CloudFlare Setup** (Optional):
   ```bash
   # Configure CloudFlare
   # Add your domain to CloudFlare
   # Configure caching rules
   # Enable security features
   ```

## Monitoring Setup

### Application Monitoring

1. **Sentry Integration**:
   ```bash
   # Install Sentry
   npm install @sentry/nextjs
   
   # Configure in next.config.js
   const { withSentryConfig } = require('@sentry/nextjs');
   ```

2. **Performance Monitoring**:
   ```typescript
   // Enable performance monitoring
   import { startPerformanceMonitoring } from '@/monitoring';
   
   await startPerformanceMonitoring({
     intervalMs: 5000,
     enableDashboard: true,
     enableAlerts: true
   });
   ```

### Infrastructure Monitoring

1. **Database Monitoring**:
   - Enable Supabase monitoring
   - Set up query performance alerts
   - Monitor connection pool usage

2. **Application Metrics**:
   ```typescript
   // Custom metrics collection
   import { MetricsCollector } from '@/monitoring/collectors/MetricsCollector';
   
   const metrics = new MetricsCollector();
   await metrics.startCollection();
   ```

### Alert Configuration

```yaml
# alerts.yml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    threshold: 5 minutes
    notification: email, slack
  
  - name: Response Time
    condition: avg_response_time > 2s
    threshold: 3 minutes
    notification: email
  
  - name: Database Performance
    condition: query_time > 1s
    threshold: 2 minutes
    notification: slack
```

## Scaling Configuration

### Horizontal Scaling

1. **Agent Scaling**:
   ```bash
   # Scale agents based on load
   npx claude-flow@alpha swarm scale --target-agents 15
   ```

2. **Database Scaling**:
   - Configure read replicas
   - Set up connection pooling
   - Implement database sharding (if needed)

### Performance Optimization

1. **Caching Strategy**:
   ```typescript
   // Multi-layer caching
   const cacheConfig = {
     levels: ['memory', 'redis', 'cdn'],
     ttl: {
       events: 300,
       venues: 3600,
       static: 86400
     }
   };
   ```

2. **Load Balancing**:
   ```bash
   # Configure load balancer
   # Distribute traffic across multiple instances
   # Health check endpoints
   ```

## Security Configuration

### Authentication Setup

1. **Supabase Auth**:
   ```typescript
   // Configure auth providers
   const authConfig = {
     providers: ['email', 'google', 'github'],
     session: {
       jwt_secret: process.env.JWT_SECRET,
       jwt_expiry: 3600
     }
   };
   ```

2. **API Security**:
   ```typescript
   // Rate limiting and validation
   import { rateLimit } from '@/lib/rate-limit';
   import { validateRequest } from '@/lib/validation';
   
   export default async function handler(req, res) {
     await rateLimit(req, res);
     await validateRequest(req);
     // Handle request
   }
   ```

### Data Protection

1. **Encryption**:
   - Enable encryption at rest
   - Use HTTPS for all communications
   - Encrypt sensitive data fields

2. **Access Control**:
   ```sql
   -- Row Level Security policies
   CREATE POLICY "Users can view their own data" ON users
     FOR SELECT USING (auth.uid() = id);
   
   CREATE POLICY "Users can update their own data" ON users
     FOR UPDATE USING (auth.uid() = id);
   ```

## Backup and Recovery

### Database Backups

1. **Automated Backups**:
   ```bash
   # Configure automatic backups
   supabase db backup create --project-ref your-prod-ref
   
   # Schedule daily backups
   crontab -e
   0 2 * * * /path/to/backup-script.sh
   ```

2. **Manual Backup**:
   ```bash
   # Create manual backup
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   
   # Restore from backup
   psql $DATABASE_URL < backup-20250917.sql
   ```

### Application Backups

1. **Code Repository**:
   - Ensure code is backed up in Git
   - Tag production releases
   - Maintain deployment history

2. **Configuration Backup**:
   ```bash
   # Backup environment variables
   vercel env pull .env.backup
   
   # Backup Supabase configuration
   supabase gen types typescript > types/supabase.ts
   ```

## Troubleshooting

### Common Issues

1. **Deployment Failures**:
   ```bash
   # Check build logs
   vercel logs
   
   # Verify environment variables
   vercel env ls
   
   # Test build locally
   npm run build
   ```

2. **Database Connection Issues**:
   ```bash
   # Test database connection
   npx supabase db ping
   
   # Check connection pool
   SELECT count(*) FROM pg_stat_activity;
   ```

3. **Agent Coordination Issues**:
   ```bash
   # Check agent status
   npx claude-flow@alpha swarm status
   
   # Restart coordination
   npx claude-flow@alpha swarm destroy
   npx claude-flow@alpha swarm init --topology hierarchical
   ```

### Performance Issues

1. **Slow Queries**:
   ```sql
   -- Identify slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   ```

2. **Memory Issues**:
   ```bash
   # Monitor memory usage
   node --inspect index.js
   
   # Analyze heap usage
   npm install -g clinic
   clinic doctor -- node index.js
   ```

### Recovery Procedures

1. **Rollback Deployment**:
   ```bash
   # Rollback to previous version
   vercel rollback
   
   # Restore database from backup
   psql $DATABASE_URL < backup-previous.sql
   ```

2. **Emergency Procedures**:
   - Activate maintenance mode
   - Notify users of issues
   - Implement temporary fixes
   - Coordinate with team for resolution

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review error logs
   - Check performance metrics
   - Update dependencies
   - Run security scans

2. **Monthly**:
   - Database maintenance (vacuum, reindex)
   - Update documentation
   - Review and update monitoring rules
   - Performance optimization review

3. **Quarterly**:
   - Security audit
   - Disaster recovery testing
   - Capacity planning review
   - Technology stack updates

### Update Procedures

1. **Dependency Updates**:
   ```bash
   # Check for updates
   npm outdated
   
   # Update dependencies
   npm update
   
   # Test after updates
   npm test
   ```

2. **Database Schema Updates**:
   ```bash
   # Create migration
   supabase migration new update_schema
   
   # Apply migration
   supabase db push
   ```

---

*This deployment guide is maintained by the Documentation Architect agent and updated with each system change.*