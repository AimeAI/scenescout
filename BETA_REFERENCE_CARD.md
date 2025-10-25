# Beta System - Quick Reference Card

## Essential Commands

```bash
# Start development
npm run dev

# Type check
npm run typecheck

# Apply migration
supabase db push

# Build for production
npm run build
```

## Environment Variables

```bash
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@scenescout.app
NEXT_PUBLIC_ENABLE_BETA_ACCESS=true
CRON_SECRET=random-secure-string
```

## Key URLs

- Beta Access: `/beta-access`
- Admin Dashboard: `/admin/beta`
- API Docs: See `BETA_INVITE_SETUP.md`

## Admin Tasks

### Grant Admin
```sql
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```

### Generate Invites
1. Go to `/admin/beta`
2. Set count or add emails
3. Click "Generate Invites"

### Export Data
Click "Export CSV" on any tab

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/beta/validate-invite` | POST | No | Validate code |
| `/api/beta/use-invite` | POST | No | Redeem code |
| `/api/beta/request-access` | POST | No | Join waitlist |
| `/api/beta/generate-invites` | POST | Admin | Generate codes |
| `/api/email/send` | POST | No | Send email |
| `/api/cron/send-reminders` | GET | Cron | Send reminders |

## Database Tables

- `beta_invites` - Invite codes
- `beta_waitlist` - Waitlist entries
- `beta_users` - Users with access
- `email_logs` - Delivery logs

## Quick Checks

### Check Invites
```sql
SELECT code, email, current_uses, max_uses FROM beta_invites;
```

### Check Waitlist
```sql
SELECT email, created_at, invited_at FROM beta_waitlist;
```

### Check Email Logs
```sql
SELECT email_type, status, COUNT(*) FROM email_logs GROUP BY 1, 2;
```

## Email Types

- `beta_invite` - Invite code delivery
- `welcome` - Welcome after signup
- `reminder` - Event reminders
- `digest` - Weekly summaries

## Common Issues

**Emails not sending?**
- Check `RESEND_API_KEY`
- Verify domain in Resend
- Check `email_logs` table

**Beta access not working?**
- Set `NEXT_PUBLIC_ENABLE_BETA_ACCESS=true`
- Check `beta_users` table
- Verify middleware running

**Admin dashboard not loading?**
- Check `is_admin=true` in users table
- Verify logged in
- Check browser console

## Testing

### Test Resend
Send to `delivered@resend.dev` for testing

### Test Flow
1. Generate invite in admin
2. Use code at `/beta-access`
3. Sign up account
4. Verify access

## Monitoring

### Stats Query
```sql
SELECT
  (SELECT COUNT(*) FROM beta_invites) as total_invites,
  (SELECT COUNT(*) FROM beta_invites WHERE current_uses > 0) as used,
  (SELECT COUNT(*) FROM beta_waitlist) as waitlist,
  (SELECT COUNT(*) FROM beta_users) as beta_users;
```

### Email Stats
```sql
SELECT
  email_type,
  COUNT(*) as sent,
  COUNT(*) FILTER (WHERE status = 'sent') as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM email_logs
GROUP BY email_type;
```

## Files Changed

**New Files:**
- `supabase/migrations/20251022_beta_access_system.sql`
- `src/app/api/beta/**/*.ts` (4 routes)
- `src/app/api/email/send/route.ts`
- `src/app/api/cron/send-reminders/route.ts`
- `src/app/admin/beta/page.tsx`
- `src/app/beta-access/page.tsx`
- `src/emails/*.tsx` (4 templates)
- `src/lib/email.ts`

**Updated Files:**
- `src/middleware.ts`
- `vercel.json`
- `.env.example`
- `package.json`

## Support Links

- Resend: https://resend.com/docs
- Full Setup: `BETA_INVITE_SETUP.md`
- Quick Start: `BETA_QUICK_START.md`
- Summary: `BETA_SYSTEM_SUMMARY.md`

---

**Keep this card handy for daily operations!**
