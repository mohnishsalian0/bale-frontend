-- Bale Backend - Helper Functions for Auto-Suggestions
-- These functions must be created after all tables exist

-- =====================================================
-- HELPER FUNCTIONS FOR AUTO-SUGGESTIONS
-- =====================================================

-- Function to get tag suggestions for products
-- Note: This function will be replaced in migration 0038 to use the new product_tags table
CREATE OR REPLACE FUNCTION get_tag_suggestions(
    search_term TEXT DEFAULT '',
    company_id_param UUID DEFAULT NULL
)
RETURNS TABLE(tag TEXT, usage_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        '' as tag,
        0::BIGINT as usage_count
    WHERE FALSE;
$$;

-- Function to get quality grade suggestions from stock units
CREATE OR REPLACE FUNCTION get_quality_grade_suggestions(
    search_term TEXT DEFAULT '',
    company_id_param UUID DEFAULT NULL
)
RETURNS TABLE(quality_grade TEXT, usage_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        su.quality_grade,
        COUNT(*) as usage_count
    FROM stock_units su
    JOIN products p ON su.product_id = p.id
    WHERE p.company_id = COALESCE(company_id_param, (SELECT company_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1))
        AND su.quality_grade IS NOT NULL
        AND su.quality_grade != ''
        AND (search_term = '' OR su.quality_grade ILIKE search_term || '%')
    GROUP BY su.quality_grade
    ORDER BY usage_count DESC, su.quality_grade ASC
    LIMIT 10;
$$;

-- Function to get job type suggestions from job works
CREATE OR REPLACE FUNCTION get_job_type_suggestions(
    search_term TEXT DEFAULT '',
    company_id_param UUID DEFAULT NULL
)
RETURNS TABLE(job_type TEXT, usage_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        jw.job_type,
        COUNT(*) as usage_count
    FROM job_works jw
    WHERE jw.company_id = COALESCE(company_id_param, (SELECT company_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1))
        AND jw.job_type IS NOT NULL
        AND jw.job_type != ''
        AND (search_term = '' OR jw.job_type ILIKE search_term || '%')
        AND jw.deleted_at IS NULL
    GROUP BY jw.job_type
    ORDER BY usage_count DESC, jw.job_type ASC
    LIMIT 10;
$$;
