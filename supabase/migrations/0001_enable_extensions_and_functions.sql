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
    NEW.modified_by := get_current_user_id();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

