-- Bale Backend - Sequence Counters
-- Company-scoped sequence number generation for all tables

-- =====================================================
-- SEQUENCE COUNTER TABLE
-- =====================================================

CREATE TABLE sequence_counters (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    table_name VARCHAR(50) NOT NULL,
    current_value INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(company_id, table_name)
);

CREATE INDEX idx_sequence_counters_lookup ON sequence_counters(company_id, table_name);

CREATE TRIGGER update_sequence_counters_updated_at
    BEFORE UPDATE ON sequence_counters
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- FUNCTION TO GET NEXT SEQUENCE NUMBER
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_sequence(p_table_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
BEGIN
    INSERT INTO sequence_counters (company_id, table_name, current_value)
    VALUES (get_jwt_company_id(), p_table_name, 1)
    ON CONFLICT (company_id, table_name)
    DO UPDATE SET current_value = sequence_counters.current_value + 1
    RETURNING current_value INTO next_val;

    RETURN next_val;
END;
$$ LANGUAGE plpgsql;
