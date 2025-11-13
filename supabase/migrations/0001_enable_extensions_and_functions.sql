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

