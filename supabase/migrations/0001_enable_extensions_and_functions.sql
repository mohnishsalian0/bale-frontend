-- Bale Backend - Extensions and Core Functions
-- Enable required extensions and create utility functions

-- Enable required extensions in extensions schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- =====================================================
-- UTILITY FUNCTIONS FOR AUTO-GENERATION
-- =====================================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate sequence numbers
CREATE OR REPLACE FUNCTION generate_sequence_number(prefix TEXT, table_name TEXT, company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_seq INTEGER;
    result TEXT;
    column_name TEXT;
BEGIN
    -- Get the appropriate column name based on table
    column_name := CASE
        WHEN table_name = 'products' THEN 'product_number'
        WHEN table_name = 'sales_orders' THEN 'order_number'
        WHEN table_name = 'job_works' THEN 'job_number'
        WHEN table_name = 'goods_outwards' THEN 'outward_number'
        WHEN table_name = 'goods_inwards' THEN 'inward_number'
        WHEN table_name = 'stock_units' THEN 'unit_number'
        ELSE 'number'
    END;

    -- Get next sequence number for this company and table
    EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM ''^%s-(\d+)$'') AS INTEGER)), 0) + 1 FROM %I WHERE company_id = $1',
                   column_name, prefix, table_name)
    INTO next_seq
    USING company_uuid;

    result := prefix || '-' || LPAD(next_seq::TEXT, 6, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;
