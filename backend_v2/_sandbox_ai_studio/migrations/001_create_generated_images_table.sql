-- Migration: Create generated_images table
-- Description: Stores AI-generated images with context inheritance and metadata
-- Date: 2026-01-21

CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID -- References users(id) if auth is implemented
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_client ON generated_images(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_task ON generated_images(task_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_concept ON generated_images(concept_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);

-- Add selected_image_id column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS selected_image_id UUID;

-- Add foreign key constraint (optional, depends on your setup)
-- ALTER TABLE tasks 
-- ADD CONSTRAINT fk_tasks_selected_image 
-- FOREIGN KEY (selected_image_id) REFERENCES generated_images(id) ON DELETE SET NULL;

-- Create view for usage tracking
CREATE OR REPLACE VIEW image_generation_usage AS
SELECT 
    client_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as images_generated,
    SUM(cost_usd) as total_cost_usd,
    AVG(generation_time_ms) as avg_generation_time_ms
FROM generated_images
GROUP BY client_id, DATE_TRUNC('month', created_at)
ORDER BY month DESC, client_id;

COMMENT ON TABLE generated_images IS 'Stores AI-generated images with full context inheritance from strategy phases';
COMMENT ON COLUMN generated_images.base_prompt IS 'Auto-generated prompt from inherited context (interview, strategy, task)';
COMMENT ON COLUMN generated_images.user_additions IS 'Additional details provided by user';
COMMENT ON COLUMN generated_images.final_prompt IS 'Complete prompt sent to DALL-E 3 API';
COMMENT ON COLUMN generated_images.revised_prompt IS 'DALL-E 3 rewrites prompts internally - this stores that version for audit';
COMMENT ON COLUMN generated_images.is_selected IS 'Whether this image was selected as the final choice for the task';
