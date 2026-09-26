-- =============================================================================
-- Migration: Create studio_credits table
-- Description: Credits system for controlling image generation in Pixely Studio
-- =============================================================================

CREATE TABLE IF NOT EXISTS studio_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create index for quick lookups by tenant
CREATE INDEX IF NOT EXISTS idx_studio_credits_tenant_id ON studio_credits(tenant_id);

-- RPC function for atomically incrementing used_credits
-- Called by the backend after a successful image generation
CREATE OR REPLACE FUNCTION increment_used_credits(p_tenant_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE studio_credits
  SET used_credits = used_credits + 1,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policy (optional, enable if using Supabase RLS)
-- ALTER TABLE studio_credits ENABLE ROW LEVEL SECURITY;

-- Insert a default record for admin/demo tenant (optional)
-- INSERT INTO studio_credits (tenant_id, total_credits, used_credits)
-- VALUES ('admin-tenant', 9999, 0)
-- ON CONFLICT (tenant_id) DO NOTHING;
