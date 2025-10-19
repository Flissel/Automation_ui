-- ============================================================================
-- ADD EDGE FUNCTION INSTANCE ID FOR MULTI-INSTANCE COORDINATION
-- Migration: 20250117_add_instance_id.sql
-- Purpose: Enable proper command routing to the correct Edge Function instance
-- ============================================================================

-- Add edge_function_instance_id column to active_desktop_clients table
ALTER TABLE active_desktop_clients
ADD COLUMN IF NOT EXISTS edge_function_instance_id TEXT;

-- Create index for efficient instance lookups
CREATE INDEX IF NOT EXISTS idx_edge_function_instance
ON active_desktop_clients(edge_function_instance_id);

-- Add index for client_id + instance_id composite lookups
CREATE INDEX IF NOT EXISTS idx_client_instance
ON active_desktop_clients(client_id, edge_function_instance_id);

-- Add target_instance_id to desktop_commands table
ALTER TABLE desktop_commands
ADD COLUMN IF NOT EXISTS target_instance_id TEXT;

-- Create index for targeting specific instances
CREATE INDEX IF NOT EXISTS idx_target_instance
ON desktop_commands(target_instance_id)
WHERE status = 'pending';

-- Add idempotency key to prevent duplicate command execution
ALTER TABLE desktop_commands
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index on idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_key
ON desktop_commands(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN active_desktop_clients.edge_function_instance_id IS 'UUID of the Edge Function instance managing this desktop client';
COMMENT ON COLUMN desktop_commands.target_instance_id IS 'UUID of the Edge Function instance that should execute this command';
COMMENT ON COLUMN desktop_commands.idempotency_key IS 'Unique key to prevent duplicate command execution across instances';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if columns were added successfully
DO $$
BEGIN
    -- Verify edge_function_instance_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'active_desktop_clients'
        AND column_name = 'edge_function_instance_id'
    ) THEN
        RAISE NOTICE '✅ Column active_desktop_clients.edge_function_instance_id added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add column active_desktop_clients.edge_function_instance_id';
    END IF;

    -- Verify target_instance_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'desktop_commands'
        AND column_name = 'target_instance_id'
    ) THEN
        RAISE NOTICE '✅ Column desktop_commands.target_instance_id added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add column desktop_commands.target_instance_id';
    END IF;

    -- Verify idempotency_key column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'desktop_commands'
        AND column_name = 'idempotency_key'
    ) THEN
        RAISE NOTICE '✅ Column desktop_commands.idempotency_key added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add column desktop_commands.idempotency_key';
    END IF;

    -- Verify indexes
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_edge_function_instance'
    ) THEN
        RAISE NOTICE '✅ Index idx_edge_function_instance created successfully';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_target_instance'
    ) THEN
        RAISE NOTICE '✅ Index idx_target_instance created successfully';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_idempotency_key'
    ) THEN
        RAISE NOTICE '✅ Index idx_idempotency_key created successfully';
    END IF;
END $$;
