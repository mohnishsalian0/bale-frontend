-- Bale Backend - Warehouse Functions
-- Cascade search vector updates for dependent tables

-- =====================================================
-- CASCADE SEARCH VECTOR UPDATE FUNCTIONS
-- =====================================================

-- Function to cascade search vector updates to dependent tables when warehouse name changes
CREATE OR REPLACE FUNCTION cascade_warehouse_search_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only cascade if name field changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN

        -- Update goods_inwards where this warehouse is referenced
        UPDATE goods_inwards
        SET updated_at = NOW()
        WHERE warehouse_id = NEW.id;

        -- Update goods_outwards where this warehouse is referenced
        UPDATE goods_outwards
        SET updated_at = NOW()
        WHERE warehouse_id = NEW.id;

        -- Update sales_orders where this warehouse is referenced
        UPDATE sales_orders
        SET updated_at = NOW()
        WHERE warehouse_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to cascade updates
CREATE TRIGGER trigger_cascade_warehouse_search_updates
    AFTER UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION cascade_warehouse_search_updates();

COMMENT ON FUNCTION cascade_warehouse_search_updates() IS 'Cascades search vector updates to dependent tables (goods_inwards, goods_outwards, sales_orders) when warehouse name changes';
