
-- =====================================================
-- MULTI-WAREHOUSE INVITE AND USER CREATION FUNCTIONS
-- =====================================================

-- Function to create staff invite with multiple warehouse assignments
CREATE OR REPLACE FUNCTION create_staff_invite(
    p_company_id UUID,
    p_company_name TEXT,
    p_role TEXT,
    p_warehouse_ids UUID[],
    p_expires_at TIMESTAMPTZ
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
    v_token := encode(extensions.gen_random_bytes(16), 'hex');

    -- Create invite record
    INSERT INTO invites (
        company_id,
        company_name,
        role,
        expires_at,
        token
    ) VALUES (
        p_company_id,
        p_company_name,
        p_role,
        p_expires_at,
        v_token
    ) RETURNING id INTO v_invite_id;

    -- Create invite_warehouses entries
    IF p_warehouse_ids IS NOT NULL AND array_length(p_warehouse_ids, 1) > 0 THEN
        FOREACH v_warehouse_id IN ARRAY p_warehouse_ids
        LOOP
            INSERT INTO invite_warehouses (company_id, invite_id, warehouse_id)
            VALUES (p_company_id, v_invite_id, v_warehouse_id);
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
    p_last_name TEXT,
    p_all_warehouses_access BOOLEAN
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
        all_warehouses_access,
        auth_user_id,
        created_by
    ) VALUES (
        v_invite_record.company_id,
        p_first_name,
        p_last_name,
        v_invite_record.role,
        v_first_warehouse_id,
        p_all_warehouses_access,
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
