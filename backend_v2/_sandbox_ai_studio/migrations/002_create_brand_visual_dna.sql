-- Migration: Create brand_visual_dna table
-- Description: Stores persistent visual identity configuration per client
-- Date: 2026-02-04
-- Purpose: Enable consistent image generation across all publications

-- ============================================================================
-- BRAND VISUAL DNA
-- One-time configuration per client that defines their visual identity
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_visual_dna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    
    -- =========================================================================
    -- COLOR PALETTE (Natural language names for AI compatibility)
    -- =========================================================================
    color_primary_name TEXT,           -- e.g., "electric blue", "warm coral"
    color_primary_hex TEXT,            -- e.g., "#0066FF" (for UI display)
    color_secondary_name TEXT,         -- e.g., "soft gold", "forest green"
    color_secondary_hex TEXT,
    color_accent_name TEXT,            -- e.g., "pure white", "charcoal gray"
    color_accent_hex TEXT,
    
    -- =========================================================================
    -- DEFAULT STYLE SETTINGS
    -- =========================================================================
    default_style TEXT DEFAULT 'natural' 
        CHECK (default_style IN ('natural', 'vivid')),
        -- natural: More realistic, subtle
        -- vivid: Hyper-real, dramatic (better for lifestyle/promo)
    
    default_lighting TEXT DEFAULT 'studio'
        CHECK (default_lighting IN ('studio', 'natural', 'dramatic', 'soft', 'golden_hour', 'neon')),
    
    default_mood TEXT DEFAULT 'professional'
        CHECK (default_mood IN ('professional', 'inspirational', 'playful', 'luxurious', 'energetic', 'calm', 'bold')),
    
    default_resolution TEXT DEFAULT '2K'
        CHECK (default_resolution IN ('1K', '2K', '4K')),
    
    -- =========================================================================
    -- VISUAL ARCHETYPES (Preferred content styles)
    -- =========================================================================
    preferred_archetypes TEXT[] DEFAULT ARRAY['lifestyle']::TEXT[]
        -- Options: 'product_hero', 'lifestyle', 'promotional', 'minimalist', 'editorial', 'behind_scenes'
        CHECK (preferred_archetypes <@ ARRAY['product_hero', 'lifestyle', 'promotional', 'minimalist', 'editorial', 'behind_scenes']::TEXT[]),
    
    -- =========================================================================
    -- PERMANENT EXCLUSIONS (Things that should NEVER appear)
    -- =========================================================================
    always_exclude TEXT[] DEFAULT ARRAY['text', 'watermarks', 'logos', 'words', 'letters', 'numbers', 'captions']::TEXT[],
    
    -- =========================================================================
    -- BRAND ESSENCE (Short descriptive phrase for prompt injection)
    -- =========================================================================
    brand_essence TEXT,                -- e.g., "Athletic innovation meets street style"
    visual_keywords TEXT[],            -- e.g., ['dynamic', 'premium', 'urban']
    
    -- =========================================================================
    -- INDUSTRY REFERENCE (For scraping leader content)
    -- =========================================================================
    industry_leader_instagram TEXT,    -- e.g., "@nike" or "nike" (without @)
    industry_leader_name TEXT,         -- e.g., "Nike"
    last_scrape_at TIMESTAMPTZ,
    
    -- =========================================================================
    -- METADATA
    -- =========================================================================
    is_configured BOOLEAN DEFAULT false,  -- True after initial setup is complete
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_brand_visual_dna_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_brand_visual_dna_updated_at
    BEFORE UPDATE ON brand_visual_dna
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_visual_dna_updated_at();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_brand_visual_dna_client ON brand_visual_dna(client_id);

-- Comments for documentation
COMMENT ON TABLE brand_visual_dna IS 'Persistent visual identity configuration per client for consistent AI image generation';
COMMENT ON COLUMN brand_visual_dna.color_primary_name IS 'Natural language color name (e.g., "electric blue") for AI prompt compatibility';
COMMENT ON COLUMN brand_visual_dna.always_exclude IS 'Elements that should NEVER appear in generated images for this brand';
COMMENT ON COLUMN brand_visual_dna.brand_essence IS 'Short phrase capturing the visual essence of the brand for prompt injection';
COMMENT ON COLUMN brand_visual_dna.industry_leader_instagram IS 'Instagram handle of industry leader for reference scraping';
