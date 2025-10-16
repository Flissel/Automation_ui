-- ============================================================================
-- SUPABASE DATABASE SETUP FOR DESKTOP STREAMING
-- Run this script in Supabase SQL Editor to create all necessary tables
-- ============================================================================

-- 1. Create active_desktop_clients table
-- ============================================================================
CREATE TABLE IF NOT EXISTS active_desktop_clients (
  client_id TEXT PRIMARY KEY,
  name TEXT,
  monitors JSONB DEFAULT '[]'::jsonb,
  capabilities JSONB DEFAULT '{}'::jsonb,
  user_id TEXT,
  friendly_name TEXT,
  hostname TEXT,
  is_streaming BOOLEAN DEFAULT FALSE,
  last_ping TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_active_clients_last_ping ON active_desktop_clients(last_ping);
CREATE INDEX IF NOT EXISTS idx_active_clients_user_id ON active_desktop_clients(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE active_desktop_clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage active clients" ON active_desktop_clients;
DROP POLICY IF EXISTS "Allow service role full access" ON active_desktop_clients;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage active clients"
  ON active_desktop_clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to view their own clients
CREATE POLICY "Users can view their own clients"
  ON active_desktop_clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL);

-- Comment on table
COMMENT ON TABLE active_desktop_clients IS 'Tracks active desktop streaming clients across Edge Function instances';
COMMENT ON COLUMN active_desktop_clients.user_id IS 'User who owns this desktop client';
COMMENT ON COLUMN active_desktop_clients.friendly_name IS 'User-defined friendly name for the machine';
COMMENT ON COLUMN active_desktop_clients.hostname IS 'Machine hostname for identification';

-- 2. Create desktop_commands table
-- ============================================================================
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

-- Create index for pending commands lookup
CREATE INDEX IF NOT EXISTS idx_desktop_commands_pending
  ON desktop_commands(desktop_client_id, status, created_at)
  WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE desktop_commands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage commands" ON desktop_commands;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage commands"
  ON desktop_commands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE desktop_commands IS 'Command queue for desktop clients to poll and execute';

-- 3. Create cleanup function for stale clients
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_stale_desktop_clients()
RETURNS void AS $$
BEGIN
  DELETE FROM active_desktop_clients
  WHERE last_ping < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON FUNCTION cleanup_stale_desktop_clients() IS 'Removes desktop clients that havent pinged in over 2 minutes';

-- 4. Verify setup
-- ============================================================================
SELECT 'Setup complete! Tables created:' as message;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('active_desktop_clients', 'desktop_commands');

-- Show current clients (should be empty initially)
SELECT COUNT(*) as client_count FROM active_desktop_clients;
