-- Bale Backend - RBAC Functions
-- JWT custom claims hook and authorization functions

-- =====================================================
-- JWT CUSTOM CLAIMS HOOK
-- =====================================================

CREATE OR REPLACE FUNCTION public.custom_access_auth_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_id uuid;
    user_company_id uuid;
    user_role text;
    user_warehouse_ids uuid[];
    user_permissions text[];
BEGIN
    -- Get user info: id, company_id, role, warehouse_ids, and permissions
    SELECT
        u.id,
        u.company_id,
        u.role,
        COALESCE(ARRAY_AGG(DISTINCT uw.warehouse_id) FILTER (WHERE uw.warehouse_id IS NOT NULL), '{}'),
        COALESCE(ARRAY_AGG(DISTINCT p.resource || '.' || p.action) FILTER (WHERE p.id IS NOT NULL), '{}')
    INTO
        user_id,
        user_company_id,
        user_role,
        user_warehouse_ids,
        user_permissions
    FROM users u
    LEFT JOIN user_warehouses uw ON uw.user_id = u.id
    LEFT JOIN roles r ON r.name = u.role
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE u.auth_user_id = (event->>'user_id')::uuid
    GROUP BY u.id, u.company_id, u.role;

    -- If no matching user profile exists yet (first login), return original event
    IF user_id IS NULL THEN
        RETURN event;
    END IF;

    -- Build custom claims
    claims := event->'claims';

    IF user_company_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{user_id}', to_jsonb(user_id));
        claims := jsonb_set(claims, '{company_id}', to_jsonb(user_company_id));
        claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
        claims := jsonb_set(claims, '{warehouse_ids}', to_jsonb(user_warehouse_ids));
        claims := jsonb_set(claims, '{permissions}', to_jsonb(user_permissions));
    END IF;

    -- Update event with new claims
    event := jsonb_set(event, '{claims}', claims);

    RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_auth_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_auth_hook FROM authenticated, anon, public;
