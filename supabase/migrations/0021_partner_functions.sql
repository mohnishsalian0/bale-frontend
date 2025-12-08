-- Bale Backend - Partner Functions
-- Search vector maintenance for full-text search

-- =====================================================
-- PARTNER SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Function to update partner search vector for full-text search
-- Weight A: first_name, last_name, company_name, phone_number
-- Weight B: email, gst_number, pan_number, partner_type
-- Weight C: city, state, address_line1, address_line2
CREATE OR REPLACE FUNCTION update_partner_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('english', COALESCE(NEW.first_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.last_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.phone_number, '')), 'A') ||

        -- Weight B: Contact and tax info
        setweight(to_tsvector('simple', COALESCE(NEW.email, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.gst_number, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.pan_number, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.partner_type, '')), 'B') ||

        -- Weight C: Location details
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.address_line1, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.address_line2, '')), 'C');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_partner_search_vector() IS 'Automatically updates the search_vector column for partners with weighted full-text search fields';

-- Create trigger for partners table
CREATE TRIGGER trigger_update_partner_search_vector
    BEFORE INSERT OR UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_partner_search_vector();

-- =====================================================
-- CASCADE SEARCH VECTOR UPDATE FUNCTIONS
-- =====================================================

-- Function to cascade search vector updates to dependent tables when partner name changes
CREATE OR REPLACE FUNCTION cascade_partner_search_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only cascade if name fields changed
    IF OLD.first_name IS DISTINCT FROM NEW.first_name OR
       OLD.last_name IS DISTINCT FROM NEW.last_name OR
       OLD.company_name IS DISTINCT FROM NEW.company_name THEN

        -- Update goods_inwards where this partner is referenced (suppliers/vendors)
        IF NEW.partner_type IN ('supplier', 'vendor') THEN
            UPDATE goods_inwards
            SET updated_at = NOW()
            WHERE partner_id = NEW.id;
        END IF;

        -- Update goods_outwards where this partner is referenced (customers)
        IF NEW.partner_type = 'customer' THEN
            UPDATE goods_outwards
            SET updated_at = NOW()
            WHERE partner_id = NEW.id;
        END IF;

        -- Update sales_orders where this partner is customer
        IF NEW.partner_type = 'customer' THEN
            UPDATE sales_orders
            SET updated_at = NOW()
            WHERE customer_id = NEW.id;
        END IF;

        -- Update sales_orders where this partner is agent
        IF NEW.partner_type = 'agent' THEN
            UPDATE sales_orders
            SET updated_at = NOW()
            WHERE agent_id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to cascade updates
CREATE TRIGGER trigger_cascade_partner_search_updates
    AFTER UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION cascade_partner_search_updates();

COMMENT ON FUNCTION cascade_partner_search_updates() IS 'Cascades search vector updates to dependent tables (goods_inwards, goods_outwards, sales_orders) when partner names change, filtered by partner_type';
