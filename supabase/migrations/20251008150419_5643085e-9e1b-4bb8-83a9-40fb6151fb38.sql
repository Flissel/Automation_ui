-- Create desktop_commands table for command queue
CREATE TABLE IF NOT EXISTS desktop_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desktop_client_id TEXT NOT NULL,
  command_type TEXT NOT NULL,
  command_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Create index for efficient polling
CREATE INDEX IF NOT EXISTS idx_desktop_commands_pending
  ON desktop_commands(desktop_client_id, status, created_at)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE desktop_commands ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
DROP POLICY IF EXISTS "Service role can manage desktop commands" ON desktop_commands;
CREATE POLICY "Service role can manage desktop commands"
  ON desktop_commands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);