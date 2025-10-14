-- Clean up old clients and add user_id support

-- Delete all existing clients (fresh start)
DELETE FROM active_desktop_clients;
DELETE FROM desktop_commands;

-- Add user_id and friendly_name columns
ALTER TABLE active_desktop_clients
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS friendly_name TEXT,
ADD COLUMN IF NOT EXISTS hostname TEXT;

-- Create index for querying by user
CREATE INDEX IF NOT EXISTS idx_active_clients_user_id
  ON active_desktop_clients(user_id);

-- Comment
COMMENT ON COLUMN active_desktop_clients.user_id IS 'User who owns this desktop client';
COMMENT ON COLUMN active_desktop_clients.friendly_name IS 'User-defined friendly name for the machine';
COMMENT ON COLUMN active_desktop_clients.hostname IS 'Machine hostname for identification';
