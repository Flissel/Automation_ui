-- Create table for desktop client commands (replaces Realtime broadcasts)
CREATE TABLE IF NOT EXISTS desktop_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desktop_client_id TEXT NOT NULL,
  command_type TEXT NOT NULL, -- 'start_capture', 'stop_capture', etc.
  command_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create index for efficient polling by desktop clients
CREATE INDEX IF NOT EXISTS idx_desktop_commands_pending
  ON desktop_commands(desktop_client_id, status, created_at)
  WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE desktop_commands ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage desktop commands"
  ON desktop_commands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to cleanup old commands (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_desktop_commands()
RETURNS void AS $$
BEGIN
  DELETE FROM desktop_commands
  WHERE created_at < NOW() - INTERVAL '5 minutes'
    AND status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE desktop_commands IS 'Command queue for desktop clients to poll instead of Realtime broadcasts';
