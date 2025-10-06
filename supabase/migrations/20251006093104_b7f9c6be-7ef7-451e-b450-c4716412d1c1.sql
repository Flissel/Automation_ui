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

CREATE INDEX IF NOT EXISTS idx_active_clients_last_ping ON active_desktop_clients(last_ping);

ALTER TABLE active_desktop_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage active clients"
  ON active_desktop_clients
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);