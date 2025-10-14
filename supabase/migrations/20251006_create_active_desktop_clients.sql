-- Create table for tracking active desktop clients across Edge Function instances
CREATE TABLE IF NOT EXISTS active_desktop_clients (
  client_id TEXT PRIMARY KEY,
  name TEXT,
  monitors JSONB DEFAULT '[]'::jsonb,
  capabilities JSONB DEFAULT '{}'::jsonb,
  is_streaming BOOLEAN DEFAULT FALSE,
  last_ping TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_active_clients_last_ping ON active_desktop_clients(last_ping);

-- Enable Row Level Security (RLS)
ALTER TABLE active_desktop_clients ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role can manage active clients"
  ON active_desktop_clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to cleanup stale clients (older than 2 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_desktop_clients()
RETURNS void AS $$
BEGIN
  DELETE FROM active_desktop_clients
  WHERE last_ping < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE active_desktop_clients IS 'Tracks active desktop streaming clients across Edge Function instances';
