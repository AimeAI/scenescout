# Beta Feedback Widget Implementation

A comprehensive floating feedback widget that allows users to submit feedback from any page in the application.

## Overview

The Beta Feedback Widget is a floating component positioned in the bottom-right corner of the screen that enables users to submit bug reports, feature requests, and general feedback during the beta testing phase.

## Files Created

### 1. `/src/components/feedback/FeedbackWidget.tsx`
**Purpose:** Client-side React component for the feedback widget UI

**Features:**
- Floating button (60x60px) with purple gradient and "Beta" badge
- Modal form with backdrop blur effect
- Three feedback types: Bug Report, Feature Request, General Feedback
- Form validation using Zod
- Character counter (10-500 chars)
- Optional email field for follow-up
- Success animation after submission
- Escape key and click-outside-to-close functionality
- Automatic path exclusion (configurable)
- Smooth animations (slide-up, fade-in)
- Mobile-responsive (44x44px minimum touch targets)

### 2. `/src/app/api/feedback/route.ts`
**Purpose:** Next.js API route for handling feedback submissions

**Features:**
- Rate limiting: 5 submissions per 10 minutes per IP
- Request validation with Zod schema
- Supabase database insertion
- Rate limit headers (X-RateLimit-*)
- Error handling with proper HTTP status codes
- IP-based rate limiting using in-memory storage
- Automatic cleanup of old rate limit records

### 3. `/supabase/migrations/20251022_create_beta_feedback_table.sql`
**Purpose:** Database migration for creating the beta_feedback table

**Features:**
- Table schema with proper constraints
- Indexes for performance optimization
- Row Level Security (RLS) policies
- Email format validation
- Admin-only view access
- Statistics view for feedback analysis
- Helper function for recent feedback counts
- Comprehensive comments for documentation

## Database Schema

```sql
CREATE TABLE public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_type TEXT NOT NULL,  -- 'Bug Report' | 'Feature Request' | 'General Feedback'
  message TEXT NOT NULL,         -- 10-500 characters
  email TEXT,                    -- Optional, validated format
  screenshot_url TEXT,           -- Future: Supabase Storage URL
  page_url TEXT NOT NULL,        -- Where feedback was submitted
  user_agent TEXT NOT NULL,      -- Browser information
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indexes
- `idx_beta_feedback_created_at` - Fast sorting by submission date
- `idx_beta_feedback_feedback_type` - Filter by feedback type
- `idx_beta_feedback_email` - Quick lookup for follow-ups

### RLS Policies
- **INSERT**: Anyone (anonymous + authenticated) can submit feedback
- **SELECT**: Only admins can view feedback
- **UPDATE**: Only admins can update feedback
- **DELETE**: Only admins can delete feedback

## Integration

### In `/src/app/layout.tsx`:

```tsx
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html>
      <body>
        {/* ... other components ... */}
        <FeedbackWidget excludePaths={['/login', '/admin']} />
      </body>
    </html>
  )
}
```

## Configuration

### Environment Variables Required:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Exclude Paths:
Customize which paths should NOT show the feedback widget:

```tsx
<FeedbackWidget excludePaths={['/login', '/admin', '/signup']} />
```

## Rate Limiting

**Limits:**
- 5 submissions per 10 minutes per IP address
- Automatic cleanup of old rate limit records every 5 minutes

**Response Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1698123456789
Retry-After: 300  (when rate limited)
```

**HTTP Status Codes:**
- `201` - Feedback submitted successfully
- `400` - Invalid request data
- `429` - Too many requests (rate limited)
- `500` - Server error

## Form Validation

### Feedback Type (Required)
- Must be one of: "Bug Report", "Feature Request", "General Feedback"

### Message (Required)
- Minimum: 10 characters
- Maximum: 500 characters
- Real-time character counter

### Email (Optional)
- Valid email format
- Used for follow-up communication only

## Styling

### Design System
- **Colors:** Indigo/purple gradient matching existing theme
- **Dark Mode:** Full dark theme support
- **Animations:** Smooth fade-in and slide-up transitions
- **Backdrop:** Blur effect for better focus
- **Touch Targets:** Minimum 44x44px for accessibility

### Button Styles
```css
Floating Button:
- Size: 60x60px
- Position: fixed bottom-6 right-6
- Z-index: 1025
- Gradient: indigo-600 to purple-600
- Hover: Scale 1.1, darker gradient
- Badge: "Beta" label in top-right

Modal:
- Max-width: 500px
- Backdrop: black/60 with blur
- Border: purple-500/30
- Gradient: gray-900 to black
```

## User Experience

### Opening the Widget
1. Click floating "Feedback" button in bottom-right corner
2. Modal slides up with fade-in animation
3. Body scroll is locked
4. Focus trapped within modal

### Submitting Feedback
1. Select feedback type from dropdown
2. Write message (10-500 chars)
3. Optionally provide email for follow-up
4. Click "Send Feedback"
5. Loading state shows spinner
6. Success state shows checkmark animation
7. Toast notification appears
8. Modal auto-closes after 2 seconds

### Closing the Widget
- Click X button in header
- Press Escape key
- Click outside modal (backdrop)
- Auto-closes after successful submission

## Future Enhancements

### Screenshot Capture
Currently stubbed out. To implement:
1. Install `html2canvas` package
2. Capture current viewport
3. Upload to Supabase Storage
4. Store URL in `screenshot_url` field

```tsx
import html2canvas from 'html2canvas'

const captureScreenshot = async (): Promise<string | null> => {
  const canvas = await html2canvas(document.body)
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png')
  })

  // Upload to Supabase Storage
  const { data } = await supabase.storage
    .from('feedback-screenshots')
    .upload(`${Date.now()}.png`, blob)

  return data?.path || null
}
```

### Admin Dashboard
Create an admin interface to:
- View all feedback submissions
- Filter by type, date, email presence
- Mark feedback as resolved
- Reply to users via email
- View analytics and trends

### Enhanced Rate Limiting
For production, replace in-memory storage with Redis:
```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

async function checkRateLimit(key: string) {
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, 600) // 10 minutes
  }
  return count <= 5
}
```

## Testing

### Manual Testing Checklist
- [ ] Widget appears on all pages except excluded paths
- [ ] Floating button is visible and clickable
- [ ] Modal opens with smooth animation
- [ ] Form validation works for all fields
- [ ] Character counter updates in real-time
- [ ] Rate limiting prevents spam (6th submission fails)
- [ ] Success state appears after submission
- [ ] Toast notification shows
- [ ] Modal closes automatically after success
- [ ] Escape key closes modal
- [ ] Click outside closes modal
- [ ] Mobile responsive (touch targets 44x44px+)
- [ ] Dark theme styling matches app

### API Testing
```bash
# Test successful submission
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackType": "Bug Report",
    "message": "This is a test feedback message with more than 10 characters",
    "email": "test@example.com",
    "page_url": "http://localhost:3000/events",
    "user_agent": "Mozilla/5.0..."
  }'

# Test rate limiting (run 6 times)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/feedback \
    -H "Content-Type: application/json" \
    -d '{"feedbackType":"Bug Report","message":"Test message number '$i'","page_url":"http://localhost:3000","user_agent":"curl"}'
done
```

## Migration Instructions

### Apply Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste contents of 20251022_create_beta_feedback_table.sql
# 3. Run query
```

### Verify Migration

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'beta_feedback';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'beta_feedback';

-- View policies
SELECT * FROM pg_policies WHERE tablename = 'beta_feedback';
```

## Troubleshooting

### Widget not appearing
- Check browser console for errors
- Verify path is not in `excludePaths`
- Ensure component is imported in layout.tsx

### Rate limiting not working
- Verify IP address extraction in `getRateLimitKey()`
- Check server logs for rate limit records
- Test with multiple IP addresses (use VPN or proxy)

### Database errors
- Verify Supabase environment variables are set
- Check migration was applied successfully
- Verify RLS policies allow anonymous inserts
- Check Supabase logs in dashboard

### Form validation issues
- Check Zod schema matches form fields
- Verify error messages are displayed correctly
- Test edge cases (empty, too long, invalid email)

## Security Considerations

1. **Rate Limiting:** Prevents spam and abuse
2. **Input Validation:** Zod schema validates all inputs
3. **RLS Policies:** Protects feedback data (admin-only access)
4. **Email Validation:** Regex pattern prevents invalid emails
5. **Anonymous Submissions:** Users don't need to be logged in
6. **No XSS:** React automatically escapes user input
7. **CSRF Protection:** Next.js built-in protection

## Performance

- **Bundle Size:** ~15KB (including dependencies)
- **First Load:** Lazy loaded with modal (not critical path)
- **Database Queries:** Indexed for fast writes
- **Rate Limit Storage:** In-memory (consider Redis for scale)
- **Animations:** CSS-based (hardware accelerated)

## Accessibility

- **Keyboard Navigation:** Tab through form, Escape to close
- **Screen Readers:** Proper ARIA labels and semantic HTML
- **Touch Targets:** Minimum 44x44px for all interactive elements
- **Focus Management:** Trapped within modal when open
- **Color Contrast:** Meets WCAG AA standards

## Analytics (Future)

Track feedback widget usage:
- Widget opens
- Submissions by type
- Completion rate
- Average message length
- Email provision rate
- Rate limit hits

```typescript
// Example analytics events
analytics.track('feedback_widget_opened')
analytics.track('feedback_submitted', { type: 'Bug Report' })
analytics.track('feedback_rate_limited')
```

## Support

For issues or questions about the feedback widget:
1. Check this documentation
2. Review Supabase logs
3. Check browser console
4. Verify environment variables
5. Test in incognito mode (clear rate limits)
