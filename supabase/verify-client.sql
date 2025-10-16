-- ============================================================================
-- VERIFY DESKTOP CLIENT IN DATABASE
-- Run this in Supabase SQL Editor to check if your desktop client is registered
-- ============================================================================

-- 1. Check if active_desktop_clients table exists
-- ============================================================================
SELECT
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'active_desktop_clients';

-- 2. Check Row Level Security (RLS) status
-- ============================================================================
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'active_desktop_clients';

-- 3. List all RLS policies on the table
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE tablename = 'active_desktop_clients';

-- 4. View all desktop clients in the database
-- ============================================================================
SELECT
  client_id,
  name,
  hostname,
  friendly_name,
  is_streaming,
  last_ping,
  connected_at,
  updated_at,
  monitors,
  capabilities
FROM active_desktop_clients
ORDER BY connected_at DESC;

-- 5. Count total clients
-- ============================================================================
SELECT COUNT(*) as total_clients FROM active_desktop_clients;

-- 6. Check for your specific client
-- ============================================================================
SELECT
  client_id,
  name,
  is_streaming,
  last_ping,
  connected_at,
  EXTRACT(EPOCH FROM (NOW() - last_ping)) as seconds_since_ping
FROM active_desktop_clients
WHERE client_id LIKE 'desktop_desktop-p303ria%';

-- 7. Check recent activity (last 2 minutes)
-- ============================================================================
SELECT
  client_id,
  name,
  last_ping,
  is_streaming,
  CASE
    WHEN last_ping > NOW() - INTERVAL '30 seconds' THEN 'ACTIVE'
    WHEN last_ping > NOW() - INTERVAL '2 minutes' THEN 'RECENT'
    ELSE 'STALE'
  END as status
FROM active_desktop_clients
ORDER BY last_ping DESC;

-- 8. Check desktop_commands table
-- ============================================================================
SELECT
  id,
  desktop_client_id,
  command_type,
  status,
  created_at,
  processed_at
FROM desktop_commands
ORDER BY created_at DESC
LIMIT 10;
