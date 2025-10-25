# GDPR Compliance System - Setup Guide

Complete implementation of GDPR-compliant privacy features for SceneScout.

## 📋 What's Included

### Legal Pages
- ✅ **Privacy Policy** (`/privacy`) - Comprehensive data collection and usage disclosure
- ✅ **Terms of Service** (`/terms`) - Legal terms including beta program disclaimer
- ✅ **Cookie Settings** (`/settings/cookies`) - Detailed cookie management

### Cookie Consent System
- ✅ **Cookie Consent Banner** - GDPR-compliant consent collection
- ✅ **Cookie Preferences** - Granular control over cookie categories
- ✅ **PostHog Integration** - Automatic opt-in/opt-out based on preferences

### GDPR Compliance Endpoints
- ✅ **Data Export** (`POST /api/user/export-data`) - Download all user data as JSON
- ✅ **Account Deletion** (`POST /api/user/delete-account`) - Permanent account deletion
- ✅ **Data Request** (`POST /api/user/data-request`) - Email data summary

### Privacy Settings
- ✅ **Privacy Settings Page** (`/settings/privacy`) - User-friendly data management
- ✅ **Download Data Button** - One-click data export
- ✅ **Delete Account Flow** - Multi-step confirmation with feedback

### Database Enhancements
- ✅ **Soft Delete Support** - 30-day grace period for deleted data
- ✅ **Audit Trail** - Track data requests and sensitive operations
- ✅ **Data Retention** - Automated cleanup of old data
- ✅ **Email Logs** - Track all emails sent to users

### Footer Component
- ✅ **Site Footer** - Legal links, contact info, copyright
- ✅ **Responsive Design** - Mobile-friendly layout

---

## 🚀 Installation Steps

### 1. Apply Database Migration

```bash
# Connect to your Supabase project
cd /Users/allthishappiness/Documents/scenescoutv1

# Apply the GDPR compliance migration
npx supabase db push

# Or manually run the SQL file
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres < supabase/migrations/20251022_gdpr_compliance.sql
```

**What this migration does:**
- Adds `deleted_at` columns to user tables
- Creates `user_data_requests` table for tracking GDPR requests
- Creates `email_logs` table for audit trail
- Creates `audit_logs` table for sensitive operations
- Adds data retention cleanup functions
- Updates RLS policies to respect soft deletes

### 2. Set Up Environment Variables

Add to your `.env.local`:

```bash
# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key_here

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://scenescout.app

# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install Dependencies

```bash
npm install resend lucide-react
# or
pnpm add resend lucide-react
# or
yarn add resend lucide-react
```

### 4. Add Footer to Main Pages

The Footer component needs to be added to page layouts. Example:

**For pages that should have a footer:**

```tsx
// src/app/page.tsx (or any other page)
import { Footer } from '@/components/layout/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Page content */}
      <main className="flex-1">
        {/* Your content */}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
```

**Pages that DON'T need footer:**
- Authentication pages
- Admin pages
- Full-screen experiences (event discovery)

### 5. Configure PostHog for Cookie Consent

Update your PostHog provider to respect cookie preferences:

```tsx
// src/providers/PostHogProvider.tsx
useEffect(() => {
  // Check cookie preferences
  const preferences = localStorage.getItem('scenescout_cookie_preferences')
  if (preferences) {
    const parsed = JSON.parse(preferences)
    if (!parsed.analytics) {
      posthog.opt_out_capturing()
    }
  }
}, [])
```

### 6. Set Up Automated Data Cleanup (Optional)

For production, set up pg_cron jobs to automatically clean up old data:

```sql
-- Run in Supabase SQL Editor

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Clean up soft-deleted records (runs daily at 2 AM UTC)
SELECT cron.schedule(
  'cleanup-deleted-records',
  '0 2 * * *',
  'SELECT cleanup_deleted_records()'
);

-- Clean up old email logs (runs daily at 3 AM UTC)
SELECT cron.schedule(
  'cleanup-email-logs',
  '0 3 * * *',
  'SELECT cleanup_old_email_logs()'
);

-- Clean up old data requests (runs weekly on Sundays at 4 AM UTC)
SELECT cron.schedule(
  'cleanup-data-requests',
  '0 4 * * 0',
  'SELECT cleanup_old_data_requests()'
);

-- Verify scheduled jobs
SELECT * FROM cron.job;
```

---

## 📊 Testing

### Test Cookie Consent
1. Open SceneScout in incognito mode
2. Cookie banner should appear after 1 second
3. Click "Customize" to see all options
4. Toggle analytics off, save preferences
5. Verify PostHog is opted out: `window.posthog.has_opted_out_capturing()`

### Test Data Export
1. Log in to SceneScout
2. Go to `/settings/privacy`
3. Click "Download Data (JSON)"
4. Verify JSON file downloads with all your data
5. Check rate limiting: Try exporting again immediately (should fail)

### Test Data Request Email
1. Go to `/settings/privacy`
2. Click "Send Email Report"
3. Check your email inbox
4. Verify summary includes correct counts

### Test Account Deletion
1. Go to `/settings/privacy`
2. Click "Delete My Account"
3. Type "DELETE MY ACCOUNT" in confirmation
4. Optionally provide feedback
5. Click "Permanently Delete Account"
6. Verify you're logged out and redirected
7. Check database: user should be deleted

### Verify Database
```sql
-- Check soft-deleted records
SELECT COUNT(*) FROM saved_events WHERE deleted_at IS NOT NULL;

-- Check data requests
SELECT * FROM user_data_requests ORDER BY created_at DESC LIMIT 10;

-- Check email logs
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;

-- Check audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🔒 Security Considerations

### Rate Limiting
- **Data Export**: 1 request per hour per IP
- **Data Request Email**: 1 request per 24 hours per user
- Uses in-memory store (consider Redis for production)

### Authentication
- All endpoints require valid Supabase auth token
- Service role key used for admin operations (account deletion)
- RLS policies enforce user data isolation

### Data Retention
- **Soft-deleted records**: 30 days, then permanently deleted
- **Email logs**: 30 days
- **Data requests**: 90 days after completion
- **Analytics data**: 90 days (PostHog configuration)

### Audit Trail
- All GDPR requests logged to `user_data_requests`
- Account deletions logged to `audit_logs`
- Email sends logged to `email_logs`

---

## 📧 Email Configuration

### Set Up Resend Domain

1. Go to [Resend Dashboard](https://resend.com)
2. Add your domain: `scenescout.app`
3. Add DNS records:
   ```
   Type: TXT
   Name: @
   Value: [verification token from Resend]

   Type: MX
   Priority: 10
   Value: feedback-smtp.us-east-1.amazonses.com
   ```
4. Wait for verification
5. Test email sending

### Email Templates

The system sends these emails:
- **Data Export Request**: Summary of user data
- **Account Deletion**: Confirmation (optional, needs implementation)

To customize email templates, edit:
- `/src/app/api/user/data-request/route.ts`

---

## 🌍 GDPR Compliance Checklist

### Legal Requirements
- ✅ Privacy Policy published and accessible
- ✅ Terms of Service published
- ✅ Cookie consent obtained before tracking
- ✅ Clear explanation of data usage
- ✅ Third-party services disclosed
- ✅ Contact information provided

### User Rights (GDPR Article 15-22)
- ✅ **Right to Access**: Data export endpoint
- ✅ **Right to Rectification**: User can edit preferences
- ✅ **Right to Erasure**: Account deletion with 30-day grace
- ✅ **Right to Data Portability**: JSON export format
- ✅ **Right to Object**: Cookie preferences, analytics opt-out
- ✅ **Right to Restriction**: Soft delete mechanism

### Data Protection
- ✅ **Encryption in Transit**: HTTPS enforced
- ✅ **Encryption at Rest**: Supabase handles this
- ✅ **Access Control**: RLS policies
- ✅ **Audit Trail**: All sensitive operations logged
- ✅ **Data Minimization**: Only collect necessary data
- ✅ **Purpose Limitation**: Clear data usage policies

### Vendor Compliance
- ✅ **Supabase**: GDPR-compliant (EU data centers available)
- ✅ **PostHog**: GDPR-compliant (EU hosting available)
- ✅ **Sentry**: GDPR-compliant
- ✅ **Resend**: GDPR-compliant

---

## 📱 User Experience Flow

### First Visit
1. User lands on SceneScout
2. After 1 second, cookie consent banner appears
3. User can:
   - Accept all cookies → Full tracking
   - Reject all → Essential only
   - Customize → Choose specific categories

### Privacy Settings Access
1. User clicks account menu (or visits `/settings/privacy`)
2. Can download data, request email summary, or delete account
3. All actions have confirmation steps

### Cookie Management
1. User visits `/settings/cookies`
2. Sees detailed list of cookies used
3. Can toggle analytics on/off
4. Changes apply immediately to PostHog

---

## 🛠️ Maintenance

### Monthly Tasks
- Review `user_data_requests` for patterns
- Check `audit_logs` for suspicious activity
- Verify cleanup jobs are running
- Monitor email delivery rates

### Quarterly Tasks
- Update Privacy Policy if features change
- Review third-party vendor compliance
- Audit data retention policies
- Test GDPR endpoints end-to-end

### Annual Tasks
- Legal review of Terms and Privacy Policy
- Comprehensive security audit
- Data Protection Impact Assessment (DPIA)
- Update cookie list if new services added

---

## 🚨 Troubleshooting

### Cookie Consent Not Appearing
- Check browser console for errors
- Verify `CookieConsent` component is imported in layout
- Clear localStorage and reload

### Data Export Failing
- Check Supabase RLS policies
- Verify auth token is valid
- Check rate limiting (1 hour window)
- Review server logs

### Account Deletion Not Working
- Verify service role key is set
- Check if user has dependent records
- Review cascade delete settings
- Check audit logs for errors

### Emails Not Sending
- Verify Resend API key is set
- Check domain verification status
- Review email logs table
- Test with Resend dashboard

---

## 📚 Resources

### Legal
- [GDPR Official Text](https://gdpr-info.eu/)
- [PIPEDA (Canada)](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/)
- [ICO Cookie Guidance](https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/)

### Technical
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [PostHog GDPR](https://posthog.com/docs/privacy/gdpr-compliance)
- [Resend Documentation](https://resend.com/docs)

---

## ✅ Verification

Before going live, verify:

1. ✅ All legal pages accessible and up-to-date
2. ✅ Cookie consent appears for new users
3. ✅ Data export works and includes all user data
4. ✅ Account deletion successfully removes all data
5. ✅ Email notifications send correctly
6. ✅ Footer appears on all public pages
7. ✅ Privacy settings page is user-friendly
8. ✅ Database migration applied successfully
9. ✅ RLS policies tested and working
10. ✅ Rate limiting prevents abuse

---

## 🎉 Deployment Checklist

- [ ] Apply database migration to production
- [ ] Set environment variables (Resend API key)
- [ ] Configure Resend domain and verify
- [ ] Set up pg_cron jobs for data cleanup
- [ ] Test all GDPR endpoints in production
- [ ] Verify cookie consent works
- [ ] Check email delivery
- [ ] Monitor error logs for 24 hours
- [ ] Announce privacy features to users

---

## 📞 Support

For questions or issues:
- **Privacy**: privacy@scenescout.app
- **Legal**: legal@scenescout.app
- **Technical**: hello@scenescout.app

---

**Last Updated**: October 22, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
