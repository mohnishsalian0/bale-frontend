-- Bale Backend - RBAC Functions
-- JWT custom claims hook and authorization functions

-- =====================================================
-- JWT CUSTOM CLAIMS HOOK
-- =====================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_company_id uuid;
    user_role text;
    user_warehouse_ids uuid[];
    user_permissions text[];
BEGIN
    -- Get user info: company_id, role, warehouse_ids, and permissions
    SELECT
        u.company_id,
        u.role,
        COALESCE(ARRAY_AGG(DISTINCT uw.warehouse_id) FILTER (WHERE uw.warehouse_id IS NOT NULL), '{}'),
        COALESCE(ARRAY_AGG(DISTINCT p.resource || '.' || p.action) FILTER (WHERE p.id IS NOT NULL), '{}')
    INTO
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
    GROUP BY u.company_id, u.role;

    -- Build custom claims
    claims := event->'claims';

    IF user_company_id IS NOT NULL THEN
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
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- AUTHORIZATION HELPER FUNCTIONS
-- =====================================================

-- Function to get company_id from JWT claims
CREATE OR REPLACE FUNCTION get_jwt_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::jsonb->>'company_id')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Function to get user_role from JWT claims
CREATE OR REPLACE FUNCTION get_jwt_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN current_setting('request.jwt.claims', true)::jsonb->>'user_role';
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Function to get warehouse_ids array from JWT claims
CREATE OR REPLACE FUNCTION get_jwt_warehouse_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN ARRAY(
        SELECT jsonb_array_elements_text(
            current_setting('request.jwt.claims', true)::jsonb->'warehouse_ids'
        )::uuid
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN ARRAY[]::uuid[];
END;
$$;

-- Main authorization function - checks if user has specific permission
CREATE OR REPLACE FUNCTION authorize(
    required_permission TEXT  -- Format: 'resource.action' e.g., 'products.create'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    user_permissions TEXT[];
    user_role TEXT;
BEGIN
    -- Get user role from JWT
    user_role := get_jwt_user_role();

    -- Admin role has all permissions except companies.delete
    IF user_role = 'admin' THEN
        IF required_permission = 'companies.delete' THEN
            RETURN FALSE;
        END IF;
        RETURN TRUE;
    END IF;

    -- For non-admin users, check permissions array from JWT
    user_permissions := ARRAY(
        SELECT jsonb_array_elements_text(
            current_setting('request.jwt.claims', true)::jsonb->'permissions'
        )
    );

    -- Check if user has the required permission
    RETURN required_permission = ANY(user_permissions);
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;
