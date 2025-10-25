-- Beta Access System Migration
-- Creates tables for beta invite codes and waitlist management

-- Beta invites table - stores invite codes and redemption tracking
CREATE TABLE IF NOT EXISTS beta_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  email TEXT,
  used_at TIMESTAMPTZ,
  used_by_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  max_uses INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  notes TEXT,

  CONSTRAINT valid_uses CHECK (current_uses <= max_uses)
);

-- Beta waitlist table - stores people waiting for access
CREATE TABLE IF NOT EXISTS beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  referral_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  invite_sent BOOLEAN DEFAULT FALSE,
  priority_score INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Beta users table - tracks who has beta access
CREATE TABLE IF NOT EXISTS beta_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  invite_code TEXT REFERENCES beta_invites(code),
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  access_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Email delivery logs - tracks all email sends
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'beta_invite', 'welcome', 'reminder', 'digest'
  subject TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  resend_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_beta_invites_code ON beta_invites(code);
CREATE INDEX IF NOT EXISTS idx_beta_invites_email ON beta_invites(email);
CREATE INDEX IF NOT EXISTS idx_beta_invites_expires ON beta_invites(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_email ON beta_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_beta_waitlist_priority ON beta_waitlist(priority_score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_beta_users_user_id ON beta_users(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type_status ON email_logs(email_type, status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- RLS Policies
ALTER TABLE beta_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Beta invites policies (admin only for most operations)
CREATE POLICY "Admin can view all invites" ON beta_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

CREATE POLICY "Admin can create invites" ON beta_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Beta waitlist policies (users can add themselves)
CREATE POLICY "Anyone can join waitlist" ON beta_waitlist
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can view own waitlist entry" ON beta_waitlist
  FOR SELECT USING (
    email = (SELECT email FROM users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

CREATE POLICY "Admin can view all waitlist" ON beta_waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

CREATE POLICY "Admin can update waitlist" ON beta_waitlist
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Beta users policies
CREATE POLICY "Users can view own beta access" ON beta_users
  FOR SELECT USING (
    user_id = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Email logs policies (admin only)
CREATE POLICY "Admin can view email logs" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = TRUE
    )
  );

-- Helper function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if invite code is valid
CREATE OR REPLACE FUNCTION is_invite_code_valid(invite_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record
  FROM beta_invites
  WHERE code = invite_code;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if expired
  IF invite_record.expires_at IS NOT NULL AND invite_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Check if max uses reached
  IF invite_record.current_uses >= invite_record.max_uses THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to use an invite code
CREATE OR REPLACE FUNCTION use_invite_code(
  invite_code TEXT,
  p_user_id TEXT,
  p_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check if code is valid
  IF NOT is_invite_code_valid(invite_code) THEN
    RETURN FALSE;
  END IF;

  -- Get the invite record
  SELECT * INTO invite_record FROM beta_invites WHERE code = invite_code FOR UPDATE;

  -- Update the invite record
  UPDATE beta_invites
  SET
    current_uses = current_uses + 1,
    used_at = NOW(),
    used_by_user_id = p_user_id
  WHERE code = invite_code;

  -- Create beta user record
  INSERT INTO beta_users (user_id, email, invite_code)
  VALUES (p_user_id, p_email, invite_code)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update waitlist when invited
CREATE OR REPLACE FUNCTION update_waitlist_on_invite()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    UPDATE beta_waitlist
    SET
      invited_at = NEW.created_at,
      invite_sent = TRUE
    WHERE email = NEW.email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_beta_invite_created
  AFTER INSERT ON beta_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_on_invite();

COMMENT ON TABLE beta_invites IS 'Stores beta invite codes and tracks their usage';
COMMENT ON TABLE beta_waitlist IS 'Stores users waiting for beta access';
COMMENT ON TABLE beta_users IS 'Tracks users with active beta access';
COMMENT ON TABLE email_logs IS 'Logs all email delivery attempts';
