-- Bale Backend - Goods Convert Guards
-- Edit/delete/cancel prevention for goods converts

-- =====================================================
-- GOODS CONVERT EDIT GUARDS
-- =====================================================

-- Prevent editing goods converts in invalid states
CREATE OR REPLACE FUNCTION prevent_goods_convert_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit if status = 'completed'
    IF OLD.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot edit goods convert - convert is completed';
    END IF;

    -- Rule 2: Cannot edit if status = 'cancelled'
    IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot edit goods convert - convert is cancelled';
    END IF;

    -- Rule 3: Cannot edit if deleted
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit goods convert - convert is deleted';
    END IF;

    -- Rule 4: Cannot change warehouse_id or output_product_id after creation
    IF NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id THEN
        RAISE EXCEPTION 'Cannot change warehouse after convert creation';
    END IF;

    IF NEW.output_product_id IS DISTINCT FROM OLD.output_product_id THEN
        RAISE EXCEPTION 'Cannot change output product after convert creation';
    END IF;

    -- Rule 5: Cannot change critical fields if status = 'completed'
    IF OLD.status = 'completed' AND (
        NEW.service_type_attribute_id IS DISTINCT FROM OLD.service_type_attribute_id OR
        NEW.start_date IS DISTINCT FROM OLD.start_date
    ) THEN
        RAISE EXCEPTION 'Cannot edit critical fields - convert is completed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_goods_convert_edit
    BEFORE UPDATE ON goods_converts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_goods_convert_edit();

COMMENT ON FUNCTION prevent_goods_convert_edit() IS 'Prevents editing goods converts that are completed, cancelled, or deleted. Prevents changing warehouse and critical fields.';

-- =====================================================
-- GOODS CONVERT DELETE GUARDS
-- =====================================================

-- Prevent deleting goods converts in invalid states
CREATE OR REPLACE FUNCTION prevent_goods_convert_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete if status = 'completed' (use soft delete)
    IF OLD.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot delete completed goods convert. Use soft delete (deleted_at) instead';
    END IF;

    -- Rule 2: Cannot delete if status = 'cancelled' (use soft delete)
    IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot delete cancelled goods convert. Use soft delete (deleted_at) instead';
    END IF;

    -- Rule 3: Cannot delete if already soft deleted
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete goods convert - already soft deleted';
    END IF;

    -- Rule 4: Can delete 'in_progress' converts (cascade deletes input_items)

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_goods_convert_delete
    BEFORE DELETE ON goods_converts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_goods_convert_delete();

COMMENT ON FUNCTION prevent_goods_convert_delete() IS 'Prevents deleting completed, cancelled, or soft-deleted goods converts. Allows deletion of in_progress converts.';

-- =====================================================
-- NOTE: Cancellation Handling
-- =====================================================

-- When convert is cancelled, input stock units are automatically reconciled
-- by trigger_reconcile_stock_on_convert_cancellation in 0039_stock_unit_reconciliation.sql
-- That trigger handles:
-- 1. Setting input stock unit status back to 'available'
-- 2. Restoring quantities (cancelled converts don't reduce quantity)
-- No additional trigger needed here.
