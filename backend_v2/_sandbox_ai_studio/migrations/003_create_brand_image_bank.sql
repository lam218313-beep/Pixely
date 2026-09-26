-- Migration: Create brand_image_bank table
-- Description: Stores scraped and uploaded reference images per client
-- Date: 2026-02-04
-- Purpose: Provide reference images for style transfer and product consistency

-- ============================================================================
-- BRAND IMAGE BANK
-- Repository of reference images from scraping + manual uploads
-- Used as input for NanoBanana Pro's multi-reference generation
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_image_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- =========================================================================
    -- IMAGE STORAGE
    -- =========================================================================
    image_url TEXT NOT NULL,              -- Public URL in Supabase Storage
    storage_path TEXT NOT NULL,           -- Path in storage bucket
    thumbnail_url TEXT,                   -- Smaller version for gallery display
    
    -- =========================================================================
    -- CATEGORIZATION
    -- =========================================================================
    category TEXT NOT NULL DEFAULT 'reference'
        CHECK (category IN ('reference', 'product', 'background', 'lifestyle', 'competitor')),
        -- reference: General style reference (from scraping or upload)
        -- product: Client's actual products (must preserve with high fidelity)
        -- background: Background textures/environments
        -- lifestyle: Lifestyle shots for mood/context
        -- competitor: Competitor content (for inspiration, not direct copy)
    
    source TEXT NOT NULL DEFAULT 'manual_upload'
        CHECK (source IN ('instagram_scrape', 'manual_upload', 'generated', 'brand_assets')),
    
    -- =========================================================================
    -- METADATA FROM SCRAPING
    -- =========================================================================
    source_url TEXT,                      -- Original URL if scraped
    source_account TEXT,                  -- Instagram handle if scraped
    scraped_caption TEXT,                 -- Original caption (for context)
    scraped_likes INTEGER,                -- Engagement metric
    scraped_at TIMESTAMPTZ,
    
    -- =========================================================================
    -- AI-EXTRACTED FEATURES (For smart selection)
    -- =========================================================================
    extracted_colors TEXT[],              -- Dominant colors detected
    extracted_mood TEXT,                  -- Detected mood/atmosphere
    extracted_objects TEXT[],             -- Detected objects/elements
    
    -- =========================================================================
    -- USAGE TRACKING
    -- =========================================================================
    usage_count INTEGER DEFAULT 0,        -- How many times used as reference
    last_used_at TIMESTAMPTZ,
    is_favorite BOOLEAN DEFAULT false,    -- Marked as frequently used
    
    -- =========================================================================
    -- MODERATION
    -- =========================================================================
    is_approved BOOLEAN DEFAULT true,     -- Approved for use (auto-true for uploads)
    is_archived BOOLEAN DEFAULT false,    -- Hidden but not deleted
    
    -- =========================================================================
    -- FILE INFO
    -- =========================================================================
    file_size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    mime_type TEXT DEFAULT 'image/jpeg',
    
    -- =========================================================================
    -- METADATA
    -- =========================================================================
    name TEXT,                            -- Optional friendly name
    description TEXT,                     -- Optional description
    tags TEXT[],                          -- Custom tags for filtering
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID                       -- User who uploaded (if applicable)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_image_bank_client ON brand_image_bank(client_id);
CREATE INDEX IF NOT EXISTS idx_brand_image_bank_category ON brand_image_bank(client_id, category);
CREATE INDEX IF NOT EXISTS idx_brand_image_bank_source ON brand_image_bank(source);
CREATE INDEX IF NOT EXISTS idx_brand_image_bank_approved ON brand_image_bank(client_id, is_approved, is_archived);
CREATE INDEX IF NOT EXISTS idx_brand_image_bank_favorites ON brand_image_bank(client_id, is_favorite) WHERE is_favorite = true;

-- Comments
COMMENT ON TABLE brand_image_bank IS 'Repository of reference images for AI generation - from scraping and uploads';
COMMENT ON COLUMN brand_image_bank.category IS 'Type of reference: product (high-fidelity), reference (style), background, lifestyle, competitor';
COMMENT ON COLUMN brand_image_bank.extracted_colors IS 'AI-detected dominant colors for smart reference selection';
COMMENT ON COLUMN brand_image_bank.usage_count IS 'Tracks popularity for smart recommendations';
