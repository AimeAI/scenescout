-- Create beta_feedback table for collecting user feedback during beta
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('Bug Report', 'Feature Request', 'General Feedback')),
  message TEXT NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 500),
  email TEXT,
  screenshot_url TEXT,
  page_url TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes for common queries
  CONSTRAINT beta_feedback_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_beta_feedback_created_at ON public.beta_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_feedback_type ON public.beta_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_email ON public.beta_feedback(email) WHERE email IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE public.beta_feedback IS 'Stores user feedback submitted during beta testing';
COMMENT ON COLUMN public.beta_feedback.id IS 'Unique identifier for the feedback entry';
COMMENT ON COLUMN public.beta_feedback.feedback_type IS 'Type of feedback: Bug Report, Feature Request, or General Feedback';
COMMENT ON COLUMN public.beta_feedback.message IS 'The feedback message (10-500 characters)';
COMMENT ON COLUMN public.beta_feedback.email IS 'Optional email for follow-up';
COMMENT ON COLUMN public.beta_feedback.screenshot_url IS 'Optional URL to screenshot stored in Supabase Storage';
COMMENT ON COLUMN public.beta_feedback.page_url IS 'URL of the page where feedback was submitted';
COMMENT ON COLUMN public.beta_feedback.user_agent IS 'Browser user agent string for debugging';
COMMENT ON COLUMN public.beta_feedback.created_at IS 'Timestamp when feedback was submitted';

-- Row Level Security (RLS)
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert feedback (anonymous submissions allowed)
CREATE POLICY "Anyone can submit beta feedback"
  ON public.beta_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only admins can view feedback
CREATE POLICY "Only admins can view beta feedback"
  ON public.beta_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update feedback (e.g., mark as resolved)
CREATE POLICY "Only admins can update beta feedback"
  ON public.beta_feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete feedback
CREATE POLICY "Only admins can delete beta feedback"
  ON public.beta_feedback
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions
GRANT INSERT ON public.beta_feedback TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.beta_feedback TO authenticated;

-- Optional: Create a view for admins to see feedback statistics
CREATE OR REPLACE VIEW public.beta_feedback_stats AS
SELECT
  feedback_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email_count,
  DATE_TRUNC('day', created_at) as submission_date,
  COUNT(*) as daily_count
FROM public.beta_feedback
GROUP BY feedback_type, DATE_TRUNC('day', created_at)
ORDER BY submission_date DESC, total_count DESC;

COMMENT ON VIEW public.beta_feedback_stats IS 'Statistics view for beta feedback analysis (admin only)';

-- Grant view access to authenticated users with admin role
GRANT SELECT ON public.beta_feedback_stats TO authenticated;

-- Create a function to get recent feedback count (for monitoring)
CREATE OR REPLACE FUNCTION public.get_recent_feedback_count(hours_ago INTEGER DEFAULT 24)
RETURNS TABLE (
  feedback_type TEXT,
  count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT
    feedback_type,
    COUNT(*) as count
  FROM public.beta_feedback
  WHERE created_at > NOW() - (hours_ago || ' hours')::INTERVAL
  GROUP BY feedback_type;
$$;

COMMENT ON FUNCTION public.get_recent_feedback_count IS 'Returns feedback counts for the last N hours';
