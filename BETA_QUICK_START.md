# Beta Invite System - Quick Start Guide

Fast setup guide for the beta invite system.

## 1. Install Dependencies

Already done - packages installed.

## 2. Environment Setup

Add to `.env.local`:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@scenescout.app

# Beta Access Control (set to false to disable)
NEXT_PUBLIC_ENABLE_BETA_ACCESS=true

# Cron Security
CRON_SECRET=generate-a-random-secure-string

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Get Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. For testing: use default `onboarding@resend.dev` domain
4. For production: add and verify your domain
5. Generate API key in dashboard
6. Copy to `.env.local`

## 4. Apply Database Migration

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Manual via Supabase Dashboard
# Copy content from: supabase/migrations/20251022_beta_access_system.sql
# Paste into SQL Editor and run
```

## 5. Grant Admin Access

Run in Supabase SQL Editor:

```sql
UPDATE users
SET is_admin = true
WHERE email = 'your-email@example.com';
```

## 6. Test the System

### A. Generate Test Invites

1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000/admin/beta`
3. Generate 5 test codes
4. Copy a code

### B. Test Beta Access Page

1. Visit: `http://localhost:3000/beta-access`
2. Enter the test code
3. Should validate successfully

### C. Test Waitlist

1. Switch to "Join Waitlist" tab
2. Enter test email
3. Should join successfully

## 7. Send Test Email

In admin dashboard:
1. Generate invite with specific email
2. Check "Send email immediately"
3. Generate
4. Check recipient's inbox

## 8. Production Deployment

### Vercel

1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `NEXT_PUBLIC_ENABLE_BETA_ACCESS`
   - `CRON_SECRET`
   - All Supabase vars
4. Deploy
5. Cron jobs auto-configured from `vercel.json`

### Supabase Production

```bash
# Set secrets for edge functions
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdom.com
```

## 9. Usage

### For Admins

**Generate Bulk Invites:**
```
Admin Dashboard → Generate Tab → Set count → Generate
```

**Invite Specific Users:**
```
Admin Dashboard → Generate Tab → Add emails (one per line) → Check "Send email" → Generate
```

**View Stats:**
```
Admin Dashboard → Top cards show stats
```

**Export Data:**
```
Admin Dashboard → View Invites/Waitlist → Export CSV button
```

### For Users

**With Invite Code:**
```
Visit /beta-access → Enter code → Sign up
```

**Without Code:**
```
Visit /beta-access → Join Waitlist → Wait for invite
```

## 10. Testing Checklist

- [ ] Database migration applied
- [ ] Admin access granted
- [ ] Resend API key configured
- [ ] Test invite generated
- [ ] Beta access page loads
- [ ] Code validation works
- [ ] Waitlist form works
- [ ] Test email sent successfully
- [ ] Admin dashboard accessible
- [ ] Middleware blocks access when enabled

## 11. Common Commands

```bash
# Development
npm run dev

# Build
npm run build

# Apply migrations
npm run db:migrate

# Type check
npm run typecheck
```

## 12. API Testing

### Validate Invite
```bash
curl -X POST http://localhost:3000/api/beta/validate-invite \
  -H "Content-Type: application/json" \
  -d '{"code":"TEST1234"}'
```

### Join Waitlist
```bash
curl -X POST http://localhost:3000/api/beta/request-access \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

### Send Email (requires auth)
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "type":"beta_invite",
    "email":"test@example.com",
    "code":"TEST1234"
  }'
```

## 13. Troubleshooting

**Emails not sending?**
- Check RESEND_API_KEY is correct
- Verify domain in Resend dashboard
- Check email_logs table for errors
- Use `delivered@resend.dev` for testing

**Beta access not blocking?**
- Ensure NEXT_PUBLIC_ENABLE_BETA_ACCESS=true
- Check middleware.ts is running
- Verify beta_users table has records
- Clear browser cache

**Admin dashboard not accessible?**
- Verify is_admin=true in users table
- Check you're logged in
- Verify user session is valid

## 14. Monitoring

### Check Invite Stats
```sql
SELECT
  COUNT(*) as total_invites,
  COUNT(*) FILTER (WHERE current_uses > 0) as used,
  COUNT(*) FILTER (WHERE current_uses = 0) as available
FROM beta_invites;
```

### Check Waitlist
```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE invited_at IS NOT NULL) as invited,
  COUNT(*) FILTER (WHERE invited_at IS NULL) as waiting
FROM beta_waitlist;
```

### Check Email Logs
```sql
SELECT
  email_type,
  status,
  COUNT(*)
FROM email_logs
GROUP BY email_type, status
ORDER BY email_type, status;
```

## 15. Next Steps

1. **Customize email templates** in `/src/emails/`
2. **Adjust public routes** in middleware if needed
3. **Set up weekly digest cron** (optional)
4. **Configure domain DNS** for production emails
5. **Add analytics tracking** for invite conversions

---

For detailed documentation, see `BETA_INVITE_SETUP.md`
