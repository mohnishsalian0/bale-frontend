-- Bale Backend - Sequence Counters
-- Company-scoped sequence number generation using PostgreSQL SEQUENCE objects

-- =====================================================
-- FUNCTION TO GET NEXT SEQUENCE NUMBER (ATOMIC)
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_sequence(p_table_name TEXT, p_company_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    next_val INTEGER;
    v_company_id UUID;
    v_sequence_full_name TEXT;
BEGIN
    -- Use provided company_id, fallback to JWT if not provided
    v_company_id := COALESCE(p_company_id, get_jwt_company_id());

    -- Construct full sequence name: seq_{company_id}_{table_name}
    -- Replace hyphens in UUID with underscores for valid SQL identifier
    v_sequence_full_name := 'seq_' || REPLACE(v_company_id::TEXT, '-', '_') || '_' || p_table_name;

    -- Create the PostgreSQL SEQUENCE object if it doesn't exist (atomic, thread-safe)
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START 1', v_sequence_full_name);

    -- Get next value from PostgreSQL SEQUENCE (atomic by default, no locking needed)
    EXECUTE format('SELECT nextval(%L)', v_sequence_full_name) INTO next_val;

    RETURN next_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_next_sequence IS 'Atomically generates next sequence number per company using PostgreSQL SEQUENCE objects. Thread-safe by design. Sequences are automatically created on first use.';
