-- Create job_runs table for tracking ingestion jobs
CREATE TABLE job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_job_runs_job_name ON job_runs(job_name);
CREATE INDEX idx_job_runs_status ON job_runs(status);
CREATE INDEX idx_job_runs_started_at ON job_runs(started_at);

-- RLS policies for job_runs (admin only)
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage job_runs" ON job_runs
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND subscription_tier = 'admin'
  )
);

-- Function to start a job run
CREATE OR REPLACE FUNCTION start_job_run(
  p_job_name TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO job_runs (job_name, metadata)
  VALUES (p_job_name, p_metadata)
  RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;

-- Function to complete a job run
CREATE OR REPLACE FUNCTION complete_job_run(
  p_job_id UUID,
  p_status TEXT,
  p_records_processed INTEGER DEFAULT 0,
  p_records_inserted INTEGER DEFAULT 0,
  p_records_updated INTEGER DEFAULT 0,
  p_records_skipped INTEGER DEFAULT 0,
  p_errors_count INTEGER DEFAULT 0,
  p_error_details TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE job_runs 
  SET 
    status = p_status,
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    records_processed = p_records_processed,
    records_inserted = p_records_inserted,
    records_updated = p_records_updated,
    records_skipped = p_records_skipped,
    errors_count = p_errors_count,
    error_details = p_error_details
  WHERE id = p_job_id;
END;
$$;