# SceneScout Production Deployment Checklist

## 🚨 Pre-Deployment Critical Validation

### 1. Code Quality & Testing
- [ ] **TypeScript Compilation**: Run `npm run typecheck` in both root and vite-app directories
- [ ] **Build Verification**: Execute `npm run build` successfully
- [ ] **Unit Tests**: All tests pass with `npm run test`
- [ ] **E2E Tests**: Playwright tests complete successfully
- [ ] **Coverage**: Test coverage meets minimum 80% threshold
- [ ] **Linting**: ESLint passes with no errors `npm run lint`
- [ ] **Dependencies**: All package vulnerabilities resolved `npm audit fix`

### 2. Environment Configuration Validation
- [ ] **Production Environment Variables**:
  ```bash
  # Required for production
  NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
  SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
  
  # API Keys (Critical)
  TICKETMASTER_API_KEY=[ticketmaster-key]
  EVENTBRITE_TOKEN=[eventbrite-token]
  GOOGLE_PLACES_API_KEY=[google-places-key]
  YELP_API_KEY=[yelp-key]
  
  # OAuth Configuration
  GITHUB_CLIENT_ID=[github-client-id]
  GITHUB_CLIENT_SECRET=[github-client-secret]
  GOOGLE_CLIENT_ID=[google-client-id]
  GOOGLE_CLIENT_SECRET=[google-client-secret]
  
  # Optional but Recommended
  OPENAI_API_KEY=[openai-key]
  RESEND_API_KEY=[resend-key]
  CLOUDINARY_CLOUD_NAME=[cloudinary-name]
  ```

### 3. Database Migration & Schema Validation
- [ ] **Supabase Production Setup**: Project created and configured
- [ ] **Schema Migration**: All migrations applied successfully
  ```bash
  supabase db push --include-all
  ```
- [ ] **RLS Policies**: Row Level Security policies verified
- [ ] **Edge Functions**: All functions deployed and tested
  ```bash
  supabase functions deploy --no-verify-jwt
  ```
- [ ] **Database Indexes**: Performance indexes created
- [ ] **Backup Strategy**: Automated backups configured

## 🚀 Deployment Procedures

### Phase 1: Staging Deployment
1. **Deploy to Staging Environment**
   ```bash
   # For Vercel deployment
   vercel --prod --env production
   
   # For Next.js standalone
   npm run build
   npm run start
   ```

2. **Staging Validation**
   - [ ] Application loads without errors
   - [ ] Authentication flow works (Google, GitHub)
   - [ ] Event discovery functional
   - [ ] Map integration operational
   - [ ] API endpoints responding
   - [ ] Real-time features working

### Phase 2: Production Deployment
1. **Pre-deployment Backup**
   ```bash
   # Backup current production database
   supabase db dump --data-only > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Deploy Application**
   ```bash
   # Deploy to production
   npm run build
   # Deploy to your hosting platform (Vercel, Netlify, etc.)
   ```

3. **Deploy Edge Functions**
   ```bash
   supabase functions deploy --project-ref [your-project-ref]
   ```

### Phase 3: Post-Deployment Validation

#### Critical System Checks
- [ ] **Health Check Endpoint**: `/api/health` returns 200
- [ ] **Database Connectivity**: Supabase connection established
- [ ] **Authentication**: User registration/login functional
- [ ] **Event Discovery**: Events loading from all APIs
- [ ] **Map Rendering**: Leaflet maps display correctly
- [ ] **Real-time Updates**: WebSocket connections stable
- [ ] **Image Loading**: Event images display properly
- [ ] **Mobile Responsiveness**: UI works on mobile devices

#### Performance Validation
- [ ] **Core Web Vitals**:
  - LCP (Largest Contentful Paint) < 2.5s
  - FID (First Input Delay) < 100ms
  - CLS (Cumulative Layout Shift) < 0.1
- [ ] **API Response Times**: < 500ms for critical endpoints
- [ ] **Bundle Size**: JavaScript bundles under acceptable limits
- [ ] **Database Query Performance**: < 200ms for standard queries

## 🔧 Critical Fixes Implementation

### TypeScript & Build Issues
```bash
# Fix TypeScript errors
npm run typecheck
# Address any compilation errors before deployment

# Verify all imports resolve correctly
npm run build
```

### Missing Dependencies Resolution
```bash
# Install any missing production dependencies
npm install --production

# Verify all peer dependencies
npm list --depth=0
```

### Database Schema Fixes
```sql
-- Ensure all critical indexes exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_location ON events USING gist(location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_date ON events(date_start);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_category ON events(category);

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 🔐 Security Checklist

### Authentication & Authorization
- [ ] **JWT Configuration**: Proper token expiration and refresh
- [ ] **OAuth Providers**: GitHub and Google OAuth configured
- [ ] **RLS Policies**: Row-level security enforced on all tables
- [ ] **API Rate Limiting**: Rate limits configured for public endpoints
- [ ] **CORS Configuration**: Proper CORS headers for production domain

### Data Protection
- [ ] **Environment Variables**: No secrets in client-side code
- [ ] **API Key Security**: Server-side API calls only
- [ ] **User Data Encryption**: Sensitive data encrypted at rest
- [ ] **Audit Logging**: User actions logged for security monitoring

## 📊 Monitoring & Alerts Setup

### Application Monitoring
- [ ] **Error Tracking**: Sentry or similar error monitoring configured
- [ ] **Performance Monitoring**: Application performance metrics tracked
- [ ] **Uptime Monitoring**: External uptime monitoring service configured
- [ ] **Database Monitoring**: Query performance and connection monitoring

### Alert Configuration
- [ ] **Error Rate Alerts**: > 5% error rate triggers alert
- [ ] **Response Time Alerts**: > 2s response time triggers alert
- [ ] **Database Alerts**: Connection issues and slow queries monitored
- [ ] **Resource Alerts**: High CPU/memory usage notifications

## 🔄 Rollback Procedures

### Emergency Rollback Plan
1. **Immediate Rollback**
   ```bash
   # Revert to previous deployment
   vercel rollback [deployment-url]
   # or restore from git
   git revert [commit-hash]
   npm run build && npm run start
   ```

2. **Database Rollback** (if needed)
   ```bash
   # Restore from backup
   supabase db reset --db-url [backup-db-url]
   ```

3. **Edge Functions Rollback**
   ```bash
   # Redeploy previous version of functions
   git checkout [previous-commit]
   supabase functions deploy
   ```

### Recovery Procedures
- [ ] **Communication Plan**: Notify stakeholders of issues
- [ ] **Status Page**: Update status page during incidents
- [ ] **Post-Mortem**: Document issues and prevention measures

## 📋 Environment-Specific Configurations

### Production Environment
```javascript
// next.config.js - Production optimizations
const nextConfig = {
  output: 'standalone',
  generateEtags: false,
  poweredByHeader: false,
  compress: true,
  images: {
    domains: ['images.unsplash.com', 'eventbrite.com'],
    loader: 'custom',
    loaderFile: './src/lib/image-loader.js'
  }
}
```

### Supabase Production Configuration
```toml
# Production supabase config
[auth]
site_url = "https://scenescout.app"
additional_redirect_urls = ["https://app.scenescout.app"]
jwt_expiry = 3600

[storage]
file_size_limit = "50MiB"

[realtime]
enabled = true
max_connections = 1000
```

## ✅ Final Deployment Validation

### Smoke Tests
- [ ] **User Registration**: New user can sign up successfully
- [ ] **Event Discovery**: Events load on homepage
- [ ] **Location Detection**: User location detected and events filtered
- [ ] **Map Functionality**: Events display correctly on map
- [ ] **Event Details**: Event detail pages load properly
- [ ] **Search & Filters**: Search and filtering work correctly
- [ ] **Mobile Experience**: All features work on mobile devices

### Performance Benchmarks
- [ ] **Lighthouse Score**: > 90 for Performance, Accessibility, Best Practices
- [ ] **Time to Interactive**: < 3 seconds
- [ ] **Database Response**: Average query time < 100ms
- [ ] **API Performance**: 95th percentile response time < 1s

### Post-Deployment Monitoring (First 24 Hours)
- [ ] **Error Monitoring**: Monitor error rates closely
- [ ] **Performance Tracking**: Watch for performance degradation
- [ ] **User Feedback**: Monitor for user-reported issues
- [ ] **Database Performance**: Watch for query performance issues
- [ ] **API Usage**: Monitor API rate limits and usage patterns

## 📞 Emergency Contacts

- **Technical Lead**: [Contact Information]
- **DevOps Engineer**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **On-Call Engineer**: [Contact Information]

## 📚 Additional Resources

- [System Architecture Documentation](/docs/SYSTEM_ARCHITECTURE_OVERVIEW.md)
- [API Documentation](/docs/API.md)
- [Troubleshooting Guide](/docs/TROUBLESHOOTING.md)
- [Performance Optimization Guide](/docs/PERFORMANCE_OPTIMIZATION_GUIDE.md)

---

**Last Updated**: September 17, 2025  
**Version**: 1.0  
**Prepared By**: Deployment Checklist Generator Agent