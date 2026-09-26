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
