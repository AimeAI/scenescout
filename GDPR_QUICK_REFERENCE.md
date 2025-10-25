# GDPR Compliance - Quick Reference

## 🚀 Quick Start

```bash
# 1. Apply database migration
npx supabase db push

# 2. Set environment variables
echo "RESEND_API_KEY=your_key" >> .env.local

# 3. Install dependencies (if needed)
npm install resend lucide-react

# 4. Test in dev mode
npm run dev
```

## 📱 Key Features

| Feature | URL | Description |
|---------|-----|-------------|
| Privacy Policy | `/privacy` | Legal disclosure |
| Terms of Service | `/terms` | Legal terms |
| Cookie Settings | `/settings/cookies` | Manage cookies |
| Privacy Settings | `/settings/privacy` | Manage data |
| Cookie Consent | Auto | Banner on first visit |
| Footer | All pages | Legal links |

## 🔌 API Endpoints

### Export Data
```bash
POST /api/user/export-data
Authorization: Bearer {token}

# Returns: JSON file download
# Rate: 1/hour
```

### Delete Account
```bash
POST /api/user/delete-account
Authorization: Bearer {token}
Body: {
  "confirmation": "DELETE MY ACCOUNT",
  "feedback": "optional reason"
}

# Returns: {success: true, deletionResults: {...}}
```

### Request Data Email
```bash
POST /api/user/data-request
Authorization: Bearer {token}

# Returns: {success: true}
# Sends: HTML email with data summary
# Rate: 1/24h
```

## 🗄️ Database

### New Tables
- `user_data_requests` - Track GDPR requests
- `email_logs` - Email audit trail
- `audit_logs` - Sensitive operations

### Soft Delete Columns
- `deleted_at` added to: saved_events, event_reminders, user_preferences, push_subscriptions

### Cleanup Functions
```sql
SELECT cleanup_deleted_records();    -- Run daily
SELECT cleanup_old_email_logs();     -- Run daily
SELECT cleanup_old_data_requests();  -- Run weekly
```

## 🍪 Cookie Consent

### Implementation
```tsx
// Already added to layout.tsx
<CookieConsent />
```

### Cookie Preferences Storage
```javascript
// Check preferences
const prefs = localStorage.getItem('scenescout_cookie_preferences')
// Format: { essential: true, analytics: boolean, marketing: boolean }

// Cookie consent flag
const consent = localStorage.getItem('scenescout_cookie_consent')
// Format: "true" if user made choice
```

### PostHog Integration
```javascript
// Automatically handled by CookieConsent component
if (preferences.analytics) {
  posthog.opt_in_capturing()
} else {
  posthog.opt_out_capturing()
}
```

## 📧 Email Configuration

### Resend Setup
1. Add domain: scenescout.app
2. Add DNS records (TXT + MX)
3. Verify domain
4. Set API key in `.env.local`

### Email Templates
Located in: `/src/app/api/user/data-request/route.ts`

## 🧪 Testing Commands

```bash
# Test cookie consent
# 1. Open incognito
# 2. Visit http://localhost:3000
# 3. Banner should appear after 1s

# Test data export
# 1. Login
# 2. Visit /settings/privacy
# 3. Click "Download Data"

# Test account deletion
# 1. Visit /settings/privacy
# 2. Click "Delete My Account"
# 3. Type "DELETE MY ACCOUNT"
# 4. Submit
```

## 📊 Database Queries

```sql
-- Check soft-deleted records
SELECT COUNT(*) FROM saved_events WHERE deleted_at IS NOT NULL;

-- View data requests
SELECT * FROM user_data_requests ORDER BY requested_at DESC LIMIT 10;

-- Check email logs
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;

-- View audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;

-- Manually trigger cleanup
SELECT cleanup_deleted_records();
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Cookie banner not showing | Clear localStorage, check console |
| Export fails | Check auth token, RLS policies |
| Deletion fails | Verify service role key is set |
| Email not sending | Check Resend API key, domain verification |
| PostHog still tracking | Check cookie preferences, clear cache |

## 🛡️ Security Checklist

- [x] All endpoints require authentication
- [x] RLS policies enabled on all tables
- [x] Rate limiting on export/request endpoints
- [x] Audit trail for sensitive operations
- [x] Soft delete with 30-day grace period
- [x] Service role key secured (not in frontend)

## 📞 Support Contacts

- Privacy: privacy@scenescout.app
- Legal: legal@scenescout.app
- Support: hello@scenescout.app

## 🔗 Documentation

- Full Setup: `GDPR_COMPLIANCE_SETUP.md`
- Summary: `GDPR_IMPLEMENTATION_SUMMARY.md`
- This File: `GDPR_QUICK_REFERENCE.md`

## ⚡ Common Tasks

### Add Footer to a Page
```tsx
import { Footer } from '@/components/layout/Footer'

export default function MyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* content */}
      </main>
      <Footer />
    </div>
  )
}
```

### Check User Cookie Preferences
```tsx
'use client'

useEffect(() => {
  const prefs = localStorage.getItem('scenescout_cookie_preferences')
  if (prefs) {
    const { analytics } = JSON.parse(prefs)
    if (!analytics) {
      // User opted out of analytics
    }
  }
}, [])
```

### Trigger Data Export (Frontend)
```tsx
const handleExport = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch('/api/user/export-data', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  const data = await response.json()
  // Download JSON...
}
```

## 🎯 Key Metrics to Monitor

- Cookie consent acceptance rate
- Data export requests per day
- Account deletion requests per day
- Email delivery success rate
- Time to process GDPR requests
- Storage used by soft-deleted records

## ✅ Pre-Launch Checklist

- [ ] Database migration applied
- [ ] RESEND_API_KEY set
- [ ] Domain verified in Resend
- [ ] All endpoints tested
- [ ] Cookie consent works
- [ ] Footer on all pages
- [ ] Legal pages reviewed
- [ ] Email templates tested
- [ ] Rate limiting tested
- [ ] RLS policies verified

---

**Quick Links:**
- Privacy: `/privacy`
- Terms: `/terms`
- Cookies: `/settings/cookies`
- Settings: `/settings/privacy`
