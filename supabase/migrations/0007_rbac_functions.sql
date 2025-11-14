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
    user_all_warehouses_access boolean;
BEGIN
    -- Get user info: only scalar values, no arrays
    SELECT
        u.id,
        u.company_id,
        u.role,
        u.all_warehouses_access
    INTO
        user_id,
        user_company_id,
        user_role,
        user_all_warehouses_access
    FROM users u
    WHERE u.auth_user_id = (event->>'user_id')::uuid;

    -- If no matching user profile exists yet (first login), return original event
    IF user_id IS NULL THEN
        RETURN event;
    END IF;

    -- Build custom claims with minimal data
    claims := event->'claims';

    IF user_company_id IS NOT NULL THEN
        claims := jsonb_set(claims, '{user_id}', to_jsonb(user_id));
        claims := jsonb_set(claims, '{company_id}', to_jsonb(user_company_id));
        claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
        claims := jsonb_set(claims, '{all_warehouses_access}', to_jsonb(user_all_warehouses_access));
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
