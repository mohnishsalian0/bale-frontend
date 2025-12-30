-- Bale Backend - Product Functions
-- Search vector maintenance for full-text search

-- =====================================================
-- PRODUCT SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Function to update product search vector for full-text search
-- Weight A: name, product_code, sequence_number
-- Weight B: hsn_code, stock_type, measuring_unit
-- Weight C: product attributes (materials, colors, tags)
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    attribute_names TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get all attribute names for this product
    SELECT STRING_AGG(pa.name, ' ')
    INTO attribute_names
    FROM product_attribute_assignments paa
    JOIN product_attributes pa ON pa.id = paa.attribute_id
    WHERE paa.product_id = NEW.id;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.product_code, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||

        -- Weight B: Codes and types
        setweight(to_tsvector('simple', COALESCE(NEW.hsn_code, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.stock_type, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.measuring_unit, '')), 'B') ||

        -- Weight C: Product attributes (materials, colors, tags)
        setweight(to_tsvector('english', COALESCE(attribute_names, '')), 'C');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_product_search_vector() IS 'Automatically updates the search_vector column for products with weighted full-text search fields';

-- Create trigger for products table
CREATE TRIGGER trigger_update_product_search_vector
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- =====================================================
-- CASCADE SEARCH VECTOR UPDATE FUNCTIONS
-- =====================================================

-- Function to cascade search vector updates to dependent tables when product name changes
CREATE OR REPLACE FUNCTION cascade_product_search_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only cascade if name field changed
    IF OLD.name IS DISTINCT FROM NEW.name THEN

        -- Update goods_inwards via stock_units where this product is referenced
        UPDATE goods_inwards gi
        SET updated_at = NOW()
        WHERE EXISTS (
            SELECT 1 FROM stock_units su
            WHERE su.created_from_inward_id = gi.id
            AND su.product_id = NEW.id
        );

        -- Update goods_outwards via goods_outward_items where this product is referenced
        UPDATE goods_outwards go
        SET updated_at = NOW()
        WHERE EXISTS (
            SELECT 1 FROM goods_outward_items goi
            JOIN stock_units su ON su.id = goi.stock_unit_id
            WHERE goi.outward_id = go.id
            AND su.product_id = NEW.id
        );

        -- Update sales_orders via sales_order_items where this product is referenced
        UPDATE sales_orders so
        SET updated_at = NOW()
        WHERE EXISTS (
            SELECT 1 FROM sales_order_items soi
            WHERE soi.sales_order_id = so.id
            AND soi.product_id = NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to cascade updates
CREATE TRIGGER trigger_cascade_product_search_updates
    AFTER UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION cascade_product_search_updates();

COMMENT ON FUNCTION cascade_product_search_updates() IS 'Cascades search vector updates to dependent tables (goods_inwards, goods_outwards, sales_orders) when product name changes';

-- =====================================================
-- TRIGGER SEARCH VECTOR UPDATE ON ATTRIBUTE CHANGES
-- =====================================================

-- Function to update product search vector when attributes change
CREATE OR REPLACE FUNCTION update_product_search_on_attribute_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update the product's search vector
    UPDATE products
    SET updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on product_attribute_assignments to update product search vector
CREATE TRIGGER trigger_update_product_search_on_attribute_change
    AFTER INSERT OR DELETE ON product_attribute_assignments
    FOR EACH ROW EXECUTE FUNCTION update_product_search_on_attribute_change();

COMMENT ON FUNCTION update_product_search_on_attribute_change() IS 'Updates product search_vector when attributes are assigned or removed';
