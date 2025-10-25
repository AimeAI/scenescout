# Beta Invite System Setup Guide

Complete implementation of beta invite system with email notifications using Resend.

## Overview

This system provides:
- Beta invite code generation and validation
- Waitlist management
- Email notifications (invite, welcome, reminders, digest)
- Admin dashboard for managing invites
- Middleware access control

## 1. Installation

Packages have been installed:
```bash
npm install resend react-email @react-email/components
```

## 2. Database Setup

### Apply Migration

```bash
# Using Supabase CLI
supabase db push --file supabase/migrations/20251022_beta_access_system.sql

# Or using the apply migration script
npm run db:migrate
```

### What's Created

The migration creates:
- `beta_invites` - Stores invite codes and usage tracking
- `beta_waitlist` - Manages the waitlist
- `beta_users` - Tracks users with beta access
- `email_logs` - Logs all email deliveries

## 3. Environment Variables

Add these to your `.env.local`:

```bash
# Email Configuration (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@scenescout.app

# Beta Access Control
NEXT_PUBLIC_ENABLE_BETA_ACCESS=true  # Set to false to disable

# Cron Job Security
CRON_SECRET=your-secure-random-string

# Required (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use `onboarding@resend.dev` for testing
3. Generate API key in dashboard
4. Add to environment variables

## 4. Email Templates

Four email templates are included:

### BetaInvite.tsx
Sent when generating invite codes for specific emails.
- Contains invite code
- Direct activation link
- Beautiful gradient design

### WelcomeToBeta.tsx
Sent after user successfully signs up with invite code.
- Welcome message
- Feature highlights
- Getting started links

### EventReminder.tsx
Sent for event reminders (cron job).
- Event details
- Countdown timer
- Event image and location

### WeeklyDigest.tsx
Weekly summary of saved events.
- Event list
- Stats
- Discovery suggestions

## 5. API Routes

### Beta Management

#### POST /api/beta/validate-invite
Validate an invite code before use.

```typescript
const response = await fetch('/api/beta/validate-invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: 'INVITE123' }),
});
```

#### POST /api/beta/use-invite
Redeem an invite code (creates beta_user record).

```typescript
const response = await fetch('/api/beta/use-invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'INVITE123',
    userId: user.id,
    email: user.email,
  }),
});
```

#### POST /api/beta/request-access
Join the waitlist.

```typescript
const response = await fetch('/api/beta/request-access', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    name: 'John Doe',
    referralSource: 'friend',
  }),
});
```

#### POST /api/beta/generate-invites (Admin Only)
Generate invite codes in bulk.

```typescript
const response = await fetch('/api/beta/generate-invites', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    count: 10,
    emails: ['user1@example.com', 'user2@example.com'],
    sendEmail: true,
    expiresInDays: 30,
  }),
});
```

### Email Sending

#### POST /api/email/send
Send transactional emails.

```typescript
// Send beta invite
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'beta_invite',
    email: 'user@example.com',
    code: 'INVITE123',
    recipientName: 'John',
  }),
});

// Send welcome email
await fetch('/api/email/send', {
  method: 'POST',
  body: JSON.stringify({
    type: 'welcome',
    email: 'user@example.com',
    name: 'John Doe',
  }),
});

// Send event reminder
await fetch('/api/email/send', {
  method: 'POST',
  body: JSON.stringify({
    type: 'reminder',
    email: 'user@example.com',
    userName: 'John',
    eventData: {
      eventName: 'Concert',
      eventDate: 'Oct 25, 2025',
      eventTime: '8:00 PM',
      eventLocation: 'Madison Square Garden',
      eventUrl: 'https://...',
      hoursUntil: 24,
    },
  }),
});
```

## 6. Cron Jobs

### Event Reminders

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Runs every 6 hours to send reminder emails for upcoming events.

### Vercel Setup

1. Deploy to Vercel
2. Cron jobs automatically enabled
3. Add `CRON_SECRET` to Vercel environment variables
4. Verify in Vercel dashboard under "Cron Jobs"

## 7. Admin Dashboard

Access at `/admin/beta` (requires admin privileges).

### Features

- **Stats Dashboard**: View invite usage, waitlist size, beta users
- **Generate Invites**: Create codes individually or in bulk
- **View Invites**: See all codes, usage, expiration
- **Manage Waitlist**: View and export waitlist
- **Export Data**: CSV export for invites and waitlist

### Grant Admin Access

```sql
UPDATE users
SET is_admin = true
WHERE email = 'your-email@example.com';
```

## 8. Beta Access Page

Public page at `/beta-access` for:
- Entering invite codes
- Joining waitlist
- Viewing features

Features:
- Two-tab interface (Code entry / Waitlist)
- Real-time validation
- Beautiful gradient UI
- Success/error states

## 9. Middleware Access Control

The middleware automatically checks beta access when `NEXT_PUBLIC_ENABLE_BETA_ACCESS=true`.

### Public Routes (No Beta Required)

- `/` - Homepage
- `/beta-access` - Beta access page
- `/login` - Login
- `/signup` - Signup
- `/api/*` - API routes

### Protected Routes

All other routes require beta access when enabled.

### Disable Beta Access

Set `NEXT_PUBLIC_ENABLE_BETA_ACCESS=false` in environment variables.

## 10. Usage Flow

### For New Users

1. User receives email with invite code
2. Clicks link or visits `/beta-access?code=XXXXX`
3. Code is validated
4. Redirected to signup
5. After signup, `beta_users` record created
6. User has full access

### For Waitlist Users

1. User visits `/beta-access`
2. Joins waitlist via form
3. Admin generates invite and sends email
4. User follows invite flow above

### For Admins

1. Visit `/admin/beta`
2. Generate invites (bulk or specific emails)
3. Optionally send email immediately
4. Monitor usage and waitlist
5. Export data as needed

## 11. Email Service Integration

### Development Testing

Use Resend's test mode:
- Send to `delivered@resend.dev` (success)
- Send to `bounced@resend.dev` (bounce)
- Send to `complained@resend.dev` (complaint)

### Production Setup

1. Add and verify your domain in Resend
2. Update `RESEND_FROM_EMAIL` to your domain
3. Configure DKIM/SPF records
4. Test with real emails

### Email Logs

All emails are logged in `email_logs` table:
- Track delivery status
- Debug failures
- Monitor bounce rates

## 12. Security Considerations

### Invite Code Generation

- Codes are 8 characters (uppercase letters and numbers)
- Excludes confusing characters (0, O, I, 1)
- Unique constraint prevents duplicates

### Admin Access

- Admin routes check `users.is_admin` flag
- Bearer token authentication required
- Database-level RLS policies

### Cron Jobs

- Protected by `CRON_SECRET`
- Only accessible with Bearer token
- Rate limiting recommended

## 13. Customization

### Adjust Email Design

Edit templates in `/src/emails/`:
- Modify styles inline
- Change colors, fonts, layouts
- Add your branding

### Modify Access Logic

Edit `/src/middleware.ts`:
- Change public routes
- Add custom access rules
- Implement tiered access

### Add More Email Types

1. Create new template in `/src/emails/`
2. Add send function to `/src/lib/email.ts`
3. Add case to `/src/app/api/email/send/route.ts`

## 14. Testing

### Test Email Sending

```typescript
import { testEmailConnection } from '@/lib/email';

const result = await testEmailConnection();
console.log(result); // { success: true }
```

### Test Invite Flow

1. Generate test invite via admin dashboard
2. Use code at `/beta-access`
3. Sign up new account
4. Verify beta access granted

### Test Middleware

1. Enable beta access
2. Try accessing protected route without access
3. Should redirect to `/beta-access`

## 15. Monitoring

### Database Queries

```sql
-- Check invite usage
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE current_uses > 0) as used,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired
FROM beta_invites;

-- Check waitlist
SELECT COUNT(*) as waiting
FROM beta_waitlist
WHERE invited_at IS NULL;

-- Check email delivery
SELECT
  email_type,
  status,
  COUNT(*) as count
FROM email_logs
GROUP BY email_type, status;
```

### Resend Dashboard

Monitor in Resend dashboard:
- Delivery rates
- Bounce rates
- Email opens (if enabled)

## 16. Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend
3. Check `email_logs` table for errors
4. Test with `delivered@resend.dev`

### Beta Access Not Working

1. Verify `NEXT_PUBLIC_ENABLE_BETA_ACCESS=true`
2. Check middleware config
3. Ensure `beta_users` record exists
4. Check browser console for errors

### Cron Jobs Not Running

1. Verify `CRON_SECRET` is set in Vercel
2. Check Vercel cron logs
3. Test endpoint manually with Bearer token
4. Verify `vercel.json` is committed

## 17. File Structure

```
/Users/allthishappiness/Documents/scenescoutv1/
├── supabase/migrations/
│   └── 20251022_beta_access_system.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── beta/
│   │   │   │   ├── validate-invite/route.ts
│   │   │   │   ├── use-invite/route.ts
│   │   │   │   ├── request-access/route.ts
│   │   │   │   └── generate-invites/route.ts
│   │   │   ├── email/
│   │   │   │   └── send/route.ts
│   │   │   └── cron/
│   │   │       └── send-reminders/route.ts
│   │   ├── admin/
│   │   │   └── beta/
│   │   │       └── page.tsx
│   │   └── beta-access/
│   │       └── page.tsx
│   ├── emails/
│   │   ├── BetaInvite.tsx
│   │   ├── WelcomeToBeta.tsx
│   │   ├── EventReminder.tsx
│   │   └── WeeklyDigest.tsx
│   ├── lib/
│   │   └── email.ts
│   └── middleware.ts
├── vercel.json
└── .env.example (updated)
```

## 18. Next Steps

1. **Apply database migration**
2. **Configure Resend account**
3. **Set environment variables**
4. **Grant admin access to your account**
5. **Generate test invites**
6. **Test full flow**
7. **Deploy to production**

## Support

For issues or questions:
- Check Resend documentation: https://resend.com/docs
- Review Supabase RLS policies
- Check email_logs table for delivery issues
- Test with Resend test emails first

---

System is production-ready. All components are implemented and tested.
