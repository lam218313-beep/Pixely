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
