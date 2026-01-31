-- Bale Backend - Extensions and Core Functions
-- Enable required extensions and create utility functions

-- Enable required extensions in extensions schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- =====================================================
-- UTILITY FUNCTIONS FOR AUTO-GENERATION
-- =====================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get current user's ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
BEGIN
    SELECT id INTO current_user_id
    FROM users
    WHERE auth_user_id = auth.uid();

    RETURN current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
    user_company UUID;
BEGIN
    SELECT company_id INTO user_company
    FROM users
    WHERE auth_user_id = auth.uid();

    RETURN user_company;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set modified_by on UPDATE
CREATE OR REPLACE FUNCTION set_modified_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_by := get_jwt_user_id();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set cancelled_at on UPDATE
CREATE OR REPLACE FUNCTION set_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.cancelled_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set cancelled_by on UPDATE
CREATE OR REPLACE FUNCTION set_cancelled_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.cancelled_by := get_jwt_user_id();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set completed_at on UPDATE
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.completed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set completed_by on UPDATE
CREATE OR REPLACE FUNCTION set_completed_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.completed_by := get_jwt_user_id();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- JWT HELPER FUNCTIONS
-- =====================================================
-- These functions extract claims from JWT tokens
-- Must be defined early as they're used in DEFAULT and RLS policies

-- Function to get user_id from JWT claims
CREATE OR REPLACE FUNCTION get_jwt_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::jsonb->>'user_id')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

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

-- Function to check if user has all_warehouses_access from JWT claims
CREATE OR REPLACE FUNCTION get_jwt_all_warehouses_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb->>'all_warehouses_access')::boolean,
        false
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Main authorization function - checks if user has specific permission
-- Supports flexible dot-path permissions with greedy wildcard matching
-- Uses backtracking algorithm for efficient wildcard matching
-- Examples:
--   'inventory.*' matches 'inventory.products.read', 'inventory.a.b.c.read'
--   'inventory.*.view' matches 'inventory.page.view', 'inventory.page.stats.view'
CREATE OR REPLACE FUNCTION authorize(
    required_permission TEXT  -- Format: flexible dot-path e.g., 'inventory.products.create'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    permission_record RECORD;
    required_parts TEXT[];
    granted_parts TEXT[];
    req_idx INT;
    grant_idx INT;
    last_star_grant INT;
    last_star_req INT;
BEGIN
    -- Split required permission once
    required_parts := string_to_array(required_permission, '.');

    -- Single loop: check all user permissions (exact match OR wildcard match)
    FOR permission_record IN
        SELECT p.permission_path
        FROM users u
        JOIN roles r ON r.name = u.role
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id = get_jwt_user_id()
    LOOP
        granted_parts := string_to_array(permission_record.permission_path, '.');

        -- Backtracking wildcard matcher
        req_idx := 1;
        grant_idx := 1;
        last_star_grant := 0;
        last_star_req := 0;

        WHILE req_idx <= array_length(required_parts, 1) LOOP
            IF grant_idx <= array_length(granted_parts, 1)
               AND granted_parts[grant_idx] = '*' THEN

                -- Record wildcard positions
                last_star_grant := grant_idx;
                last_star_req := req_idx;

                grant_idx := grant_idx + 1;  -- move past '*'

            ELSIF grant_idx <= array_length(granted_parts, 1)
                  AND granted_parts[grant_idx] = required_parts[req_idx] THEN

                -- Direct match
                grant_idx := grant_idx + 1;
                req_idx := req_idx + 1;

            ELSIF last_star_grant > 0 THEN
                -- Backtrack: extend '*' to include this segment
                last_star_req := last_star_req + 1;
                req_idx := last_star_req;
                grant_idx := last_star_grant + 1;

            ELSE
                -- No match possible
                EXIT;
            END IF;
        END LOOP;

        -- After consuming required_parts, remaining granted_parts must be '*' only
        WHILE grant_idx <= array_length(granted_parts, 1)
              AND granted_parts[grant_idx] = '*' LOOP
            grant_idx := grant_idx + 1;
        END LOOP;

        IF grant_idx > array_length(granted_parts, 1) THEN
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Helper function to check if user has access to a specific warehouse
CREATE OR REPLACE FUNCTION has_warehouse_access(warehouse_id_to_check UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    -- If user has all_warehouses_access flag, return true
    IF get_jwt_all_warehouses_access() THEN
        RETURN TRUE;
    END IF;

    -- Otherwise check if warehouse is in user_warehouses
    RETURN EXISTS(
        SELECT 1
        FROM user_warehouses
        WHERE user_id = get_jwt_user_id()
        AND warehouse_id = warehouse_id_to_check
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

