-- Bale Backend - Helper Functions for Auto-Suggestions
-- These functions must be created after all tables exist

-- =====================================================
-- HELPER FUNCTIONS FOR AUTO-SUGGESTIONS
-- =====================================================

-- Function to get tag suggestions for products
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
        t as tag,
        COUNT(*) as usage_count
    FROM products, unnest(tags) as t
    WHERE company_id = COALESCE(company_id_param, (SELECT company_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1))
        AND tags IS NOT NULL
        AND array_length(tags, 1) > 0
        AND (search_term = '' OR t ILIKE search_term || '%')
    GROUP BY t
    ORDER BY usage_count DESC, tag ASC
    LIMIT 10;
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

-- =====================================================
-- MULTI-WAREHOUSE INVITE AND USER CREATION FUNCTIONS
-- =====================================================

-- Function to create staff invite with multiple warehouse assignments
CREATE OR REPLACE FUNCTION create_staff_invite(
    p_company_id UUID,
    p_company_name TEXT,
    p_role TEXT,
    p_warehouse_ids UUID[],
    p_expires_at TIMESTAMPTZ,
    p_created_by UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite_id UUID;
    v_token TEXT;
    v_warehouse_id UUID;
BEGIN
    -- Validate role
    IF p_role NOT IN ('admin', 'staff') THEN
        RAISE EXCEPTION 'Invalid role: %', p_role;
    END IF;

    -- Validate warehouse assignment for staff role
    IF p_role = 'staff' AND (p_warehouse_ids IS NULL OR array_length(p_warehouse_ids, 1) = 0) THEN
        RAISE EXCEPTION 'Staff role requires at least one warehouse assignment';
    END IF;

    -- Generate unique token
    v_token := encode(extensions.gen_random_bytes(32), 'hex');

    -- Create invite record
    INSERT INTO invites (
        company_id,
        company_name,
        role,
        expires_at,
        created_by,
        token
    ) VALUES (
        p_company_id,
        p_company_name,
        p_role,
        p_expires_at,
        p_created_by,
        v_token
    ) RETURNING id INTO v_invite_id;

    -- Create invite_warehouses entries
    IF p_warehouse_ids IS NOT NULL AND array_length(p_warehouse_ids, 1) > 0 THEN
        FOREACH v_warehouse_id IN ARRAY p_warehouse_ids
        LOOP
            INSERT INTO invite_warehouses (invite_id, warehouse_id)
            VALUES (v_invite_id, v_warehouse_id);
        END LOOP;
    END IF;

    RETURN v_token;
END;
$$;

-- Function to create user from invite with warehouse assignments
CREATE OR REPLACE FUNCTION create_user_from_invite(
    p_auth_user_id UUID,
    p_invite_token TEXT,
    p_first_name TEXT,
    p_last_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite_record RECORD;
    v_new_user_id UUID;
    v_first_warehouse_id UUID;
BEGIN
    -- Get and validate invite
    SELECT * INTO v_invite_record
    FROM invites
    WHERE token = p_invite_token
        AND used_at IS NULL
        AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invite token';
    END IF;

    -- Get first warehouse for backward compatibility with users.warehouse_id
    SELECT warehouse_id INTO v_first_warehouse_id
    FROM invite_warehouses
    WHERE invite_id = v_invite_record.id
    LIMIT 1;

    -- Create user record
    INSERT INTO users (
        company_id,
        first_name,
        last_name,
        role,
        warehouse_id,
        auth_user_id,
        created_by
    ) VALUES (
        v_invite_record.company_id,
        p_first_name,
        p_last_name,
        v_invite_record.role,
        v_first_warehouse_id,
        p_auth_user_id,
        v_invite_record.created_by
    ) RETURNING id INTO v_new_user_id;

    -- Copy warehouse assignments from invite_warehouses to user_warehouses
    INSERT INTO user_warehouses (user_id, warehouse_id, created_by)
    SELECT v_new_user_id, warehouse_id, v_invite_record.created_by
    FROM invite_warehouses
    WHERE invite_id = v_invite_record.id;

    -- Mark invite as used
    UPDATE invites
    SET used_at = NOW(),
        used_by_user_id = v_new_user_id
    WHERE id = v_invite_record.id;

    RETURN v_new_user_id;
END;
$$;
