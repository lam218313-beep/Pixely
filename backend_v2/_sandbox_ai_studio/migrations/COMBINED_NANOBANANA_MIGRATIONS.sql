-- ========================================
-- FILE: migrations/001_create_generated_images_table.sql
-- ========================================
-- Migration: Create generated_images table (PRE-REQUISITE)
-- Description: Stores AI-generated images with context inheritance and metadata
-- Date: 2026-01-21

CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    task_id UUID, -- NULL if standalone generation
    
    -- Contexto Heredado
    concept_id UUID, -- References strategy_nodes
    objective_context TEXT,
    strategy_context TEXT,
    
    -- Prompt Engineering
    base_prompt TEXT NOT NULL, -- Auto-generated from context
    user_additions TEXT, -- Additional user inputs
    final_prompt TEXT NOT NULL, -- Actual prompt sent to API
    revised_prompt TEXT, -- DALL-E 3's rewritten prompt (for audit)
    
    -- Configuration
    style_preset TEXT DEFAULT 'realistic', -- realistic, illustration, 3d_render, minimalist, vintage
    aspect_ratio TEXT DEFAULT '1:1', -- 1:1, 16:9, 9:16, 4:3
    negative_prompt TEXT, -- Elements to avoid
    mood_tone TEXT, -- Desired atmosphere
    
    -- Result
    image_url TEXT NOT NULL, -- URL in Supabase Storage
    storage_path TEXT NOT NULL, -- Path in storage bucket
    generation_model TEXT DEFAULT 'dall-e-3',
    
    -- Metadata
    cost_usd DECIMAL(10,4) DEFAULT 0.03,
    generation_time_ms INTEGER,
    is_selected BOOLEAN DEFAULT false, -- If chosen for the task
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- References users(id) if auth is implemented
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_client ON generated_images(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_task ON generated_images(task_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_concept ON generated_images(concept_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);

-- Add selected_image_id column to tasks table safely
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='selected_image_id') THEN
            ALTER TABLE tasks ADD COLUMN selected_image_id UUID;
        END IF;
    END IF;
END $$;


-- ========================================
-- FILE: migrations/002_create_brand_visual_dna.sql
-- ========================================
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


-- ========================================
-- FILE: migrations/003_create_brand_image_bank.sql
-- ========================================
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


-- ========================================
-- FILE: migrations/004_create_generation_templates.sql
-- ========================================
-- Migration: Create generation_templates table
-- Description: Pre-built prompt templates for different content types
-- Date: 2026-02-04
-- Purpose: Standardize generation quality across different ad types

-- ============================================================================
-- GENERATION TEMPLATES
-- Pre-built prompt structures for consistent, high-quality outputs
-- ============================================================================

CREATE TABLE IF NOT EXISTS generation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- =========================================================================
    -- IDENTIFICATION
    -- =========================================================================
    name TEXT NOT NULL UNIQUE,            -- e.g., "PRODUCT_HERO_V1"
    display_name TEXT NOT NULL,           -- e.g., "Producto Protagonista"
    description TEXT,
    
    -- =========================================================================
    -- CATEGORIZATION
    -- =========================================================================
    category TEXT NOT NULL
        CHECK (category IN ('product', 'lifestyle', 'promotional', 'minimalist', 'editorial', 'seasonal')),
    
    format_compatibility TEXT[] DEFAULT ARRAY['post', 'story', 'reel', 'cover']::TEXT[],
        -- Which content formats this template works best with
    
    -- =========================================================================
    -- PROMPT STRUCTURE
    -- =========================================================================
    -- Template uses placeholders: {brand_name}, {product}, {colors}, {mood}, etc.
    prompt_template TEXT NOT NULL,
    
    -- Example of a complete prompt_template:
    -- "A high-resolution, studio-lit product photograph of {product_description} 
    --  for {brand_name}. The scene features {color_palette} tones with {lighting} lighting.
    --  Style: {style}. Mood: {mood}. {custom_additions}
    --  Technical: {aspect_ratio} format, professional commercial photography.
    --  IMPORTANT: No text, no watermarks, no logos, no words."
    
    -- =========================================================================
    -- DEFAULT SETTINGS
    -- =========================================================================
    default_aspect_ratio TEXT DEFAULT '1:1'
        CHECK (default_aspect_ratio IN ('1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9')),
    
    default_resolution TEXT DEFAULT '2K'
        CHECK (default_resolution IN ('1K', '2K', '4K')),
    
    default_style TEXT DEFAULT 'natural'
        CHECK (default_style IN ('natural', 'vivid')),
    
    -- =========================================================================
    -- REFERENCE IMAGE REQUIREMENTS
    -- =========================================================================
    requires_product_image BOOLEAN DEFAULT false,
    requires_style_reference BOOLEAN DEFAULT true,
    min_style_references INTEGER DEFAULT 1,
    max_style_references INTEGER DEFAULT 6,
    
    -- =========================================================================
    -- MODEL SELECTION
    -- =========================================================================
    recommended_model TEXT DEFAULT 'gemini-2.5-flash-image'
        CHECK (recommended_model IN ('gemini-2.5-flash-image', 'gemini-3-pro-image-preview')),
        -- flash: Fast, good for iterations
        -- pro: Best quality, use for final outputs
    
    -- =========================================================================
    -- METADATA
    -- =========================================================================
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2),              -- User ratings (1-5)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO generation_templates (name, display_name, description, category, prompt_template, requires_product_image, recommended_model) VALUES

('PRODUCT_HERO_V1', 'Producto Protagonista', 
 'Fotografía de producto profesional con fondo limpio y iluminación de estudio',
 'product',
 'A high-resolution, studio-lit product photograph of {product_description} for {brand_name}. Clean {background_color} background. The lighting is a professional three-point softbox setup creating soft, diffused highlights. Camera angle: slightly elevated 45-degree shot. Style: {style}. Color palette emphasizing {color_palette}. Mood: {mood}. Ultra-realistic, sharp focus on product details. {aspect_ratio} format. {custom_additions} CRITICAL: Absolutely no text, no watermarks, no logos, no words, no letters, no numbers anywhere in the image.',
 true, 'gemini-3-pro-image-preview'),

('LIFESTYLE_V1', 'Estilo de Vida',
 'Producto integrado en un contexto de uso real, lifestyle aspiracional',
 'lifestyle', 
 'A photorealistic lifestyle photograph featuring {product_description} by {brand_name} in a {scene_context}. Natural {lighting} lighting creating a {mood} atmosphere. The product is being used naturally, not posed. Style: {style}. Color palette: {color_palette}. Shot with an 85mm lens for natural depth of field. {aspect_ratio} format. {custom_additions} CRITICAL: Absolutely no text, no watermarks, no logos, no words, no letters anywhere in the image.',
 true, 'gemini-2.5-flash-image'),

('PROMOTIONAL_V1', 'Promocional Impactante',
 'Imagen llamativa para anuncios y promociones con alto impacto visual',
 'promotional',
 'A bold, eye-catching promotional image for {brand_name}. Dynamic composition featuring {visual_elements}. {lighting} lighting with {color_palette} color scheme. High contrast, vibrant, designed to stop scrolling. Mood: {mood}. Style: {style}. Professional advertising photography quality. {aspect_ratio} format. {custom_additions} CRITICAL: Absolutely no text, no watermarks, no logos, no words, no letters, no numbers. Leave clean space for text overlay.',
 false, 'gemini-2.5-flash-image'),

('MINIMALIST_V1', 'Minimalista Elegante',
 'Composición limpia con espacio negativo para overlays de texto',
 'minimalist',
 'A minimalist composition for {brand_name}. Single {subject} positioned in the {position} of the frame. Vast, empty {background_color} background creating significant negative space. Soft, {lighting} lighting. Style: {style}. Subtle {color_palette} tones. Mood: {mood}. {aspect_ratio} format. {custom_additions} CRITICAL: No text, no watermarks, no logos. Clean negative space for text overlay.',
 false, 'gemini-2.5-flash-image'),

('EDITORIAL_V1', 'Editorial de Moda',
 'Estilo editorial de revista para contenido premium',
 'editorial',
 'An editorial-style photograph for {brand_name} magazine feature. {scene_description}. {lighting} lighting creating {mood} atmosphere. Shot with professional fashion photography aesthetics. Style: {style}. Color grading: {color_palette}. Artistic composition with intentional framing. {aspect_ratio} format. {custom_additions} CRITICAL: Absolutely no text, no watermarks, no logos, no words anywhere.',
 false, 'gemini-3-pro-image-preview'),

('SEASONAL_PROMO_V1', 'Promoción Estacional',
 'Contenido temático para campañas estacionales (navidad, verano, etc)',
 'seasonal',
 'A {season_theme} themed promotional image for {brand_name}. Featuring {visual_elements} with seasonal {season_elements}. {lighting} lighting. Color palette: {color_palette} with {season_colors}. Mood: {mood}, festive, aspirational. Style: {style}. {aspect_ratio} format. {custom_additions} CRITICAL: No text, no watermarks, no logos, no words, no letters. Leave space for promotional text overlay.',
 false, 'gemini-2.5-flash-image')

ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generation_templates_category ON generation_templates(category);
CREATE INDEX IF NOT EXISTS idx_generation_templates_active ON generation_templates(is_active);

-- Comments
COMMENT ON TABLE generation_templates IS 'Pre-built prompt templates for standardized, high-quality image generation';
COMMENT ON COLUMN generation_templates.prompt_template IS 'Template with placeholders like {brand_name}, {product_description}, {color_palette}, etc.';
COMMENT ON COLUMN generation_templates.requires_product_image IS 'If true, user must provide a product image for high-fidelity preservation';


-- ========================================
-- FILE: migrations/005_update_generated_images_for_nanobanana.sql
-- ========================================
-- Migration: Update generated_images table for NanoBanana integration
-- Description: Add fields for reference tracking and enforce task requirement
-- Date: 2026-02-04
-- Purpose: Support multi-reference generation and close the planning loop

-- ============================================================================
-- UPDATE GENERATED_IMAGES TABLE
-- Add support for NanoBanana Pro features and enforce task linkage
-- ============================================================================

-- Add new columns for NanoBanana integration
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES generation_templates(id),
ADD COLUMN IF NOT EXISTS reference_images JSONB DEFAULT '[]'::JSONB,
    -- Array of {image_bank_id, category, role} objects
    -- role: 'style' | 'product' | 'background'
ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'gemini-2.5-flash-image'
    CHECK (model_used IN ('gemini-2.5-flash-image', 'gemini-3-pro-image-preview', 'dall-e-3')),
ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT '2K'
    CHECK (resolution IN ('1K', '2K', '4K')),
ADD COLUMN IF NOT EXISTS thinking_images JSONB DEFAULT '[]'::JSONB,
    -- Intermediate "thought" images from Gemini 3 Pro (for debugging/review)
ADD COLUMN IF NOT EXISTS generation_params JSONB DEFAULT '{}'::JSONB;
    -- Full parameters used for generation (for reproducibility)

-- Make task_id NOT NULL for new records (enforces task linkage)
-- Note: We use a comment instead of constraint to avoid breaking existing data
COMMENT ON COLUMN generated_images.task_id IS 'REQUIRED: All generations must be linked to a task from planning';

-- Add index for template lookups
CREATE INDEX IF NOT EXISTS idx_generated_images_template ON generated_images(template_id);

-- ============================================================================
-- UPDATE TASKS TABLE
-- Add fields to track generation status
-- ============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending'
    CHECK (generation_status IN ('pending', 'in_progress', 'generated', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS generation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_generation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_image_id UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Index for filtering tasks by generation status
CREATE INDEX IF NOT EXISTS idx_tasks_generation_status ON tasks(client_id, generation_status);

-- ============================================================================
-- CREATE VIEW FOR PENDING GENERATION TASKS
-- Easy query for tasks that need images
-- ============================================================================

CREATE OR REPLACE VIEW tasks_pending_generation AS
SELECT 
    t.id,
    t.client_id,
    t.title,
    t.format,
    t.execution_date,
    t.selected_hook,
    t.key_elements,
    t.strategic_purpose,
    t.generation_status,
    t.generation_count,
    c.nombre as client_name,
    bvd.is_configured as brand_configured,
    (SELECT COUNT(*) FROM brand_image_bank bib WHERE bib.client_id = t.client_id AND bib.is_approved = true) as available_references
FROM tasks t
JOIN clients c ON t.client_id = c.id
LEFT JOIN brand_visual_dna bvd ON bvd.client_id = t.client_id
WHERE t.generation_status IN ('pending', 'in_progress', 'rejected')
  AND t.status != 'HECHO'
ORDER BY t.execution_date ASC NULLS LAST, t.created_at DESC;

COMMENT ON VIEW tasks_pending_generation IS 'Tasks that need image generation, ordered by execution date';

-- ============================================================================
-- FUNCTION TO UPDATE REFERENCE USAGE COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_reference_usage()
RETURNS TRIGGER AS $$
DECLARE
    ref JSONB;
    ref_id UUID;
BEGIN
    -- Loop through reference_images array and increment usage_count
    IF NEW.reference_images IS NOT NULL AND jsonb_array_length(NEW.reference_images) > 0 THEN
        FOR ref IN SELECT * FROM jsonb_array_elements(NEW.reference_images)
        LOOP
            ref_id := (ref->>'image_bank_id')::UUID;
            IF ref_id IS NOT NULL THEN
                UPDATE brand_image_bank 
                SET usage_count = usage_count + 1,
                    last_used_at = NOW()
                WHERE id = ref_id;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_reference_usage
    AFTER INSERT ON generated_images
    FOR EACH ROW
    EXECUTE FUNCTION increment_reference_usage();

-- ============================================================================
-- FUNCTION TO UPDATE TASK GENERATION STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_task_generation_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update task generation count and timestamp
    UPDATE tasks 
    SET generation_count = generation_count + 1,
        last_generation_at = NOW(),
        generation_status = CASE 
            WHEN generation_status = 'pending' THEN 'generated'
            ELSE generation_status
        END
    WHERE id = NEW.task_id::TEXT;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_generation_status
    AFTER INSERT ON generated_images
    FOR EACH ROW
    WHEN (NEW.task_id IS NOT NULL)
    EXECUTE FUNCTION update_task_generation_status();

