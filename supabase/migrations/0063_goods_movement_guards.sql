-- Bale Backend - Goods Movement Guards
-- Edit/delete/cancel prevention for goods inward, outward, and stock units

-- =====================================================
-- GOODS INWARD GUARDS
-- =====================================================

-- Auto-delete all stock units when inward is cancelled
CREATE OR REPLACE FUNCTION auto_delete_stock_units_on_inward_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- When inward is cancelled, soft delete all its stock units
    -- Semantically: cancelled inward means those units never existed
    IF NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
        UPDATE stock_units
        SET deleted_at = NOW()
        WHERE created_from_inward_id = NEW.id
          AND deleted_at IS NULL;  -- Don't re-delete already deleted units
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_delete_stock_units
    AFTER UPDATE ON goods_inwards
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION auto_delete_stock_units_on_inward_cancel();

-- Triggers to populate cancelled_at and cancelled_by fields
CREATE TRIGGER set_goods_inwards_cancelled_at
    BEFORE UPDATE ON goods_inwards
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_at();

CREATE TRIGGER set_goods_inwards_cancelled_by
    BEFORE UPDATE ON goods_inwards
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_by();

-- Unified function to prevent editing goods inwards in invalid states
CREATE OR REPLACE FUNCTION prevent_goods_inward_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit cancelled inwards
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot edit goods inward - inward is cancelled';
    END IF;

    -- Rule 2: Cannot edit if deleted
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit goods inward - inward is deleted';
    END IF;

    -- Rule 3: Cannot cancel if has invoice
    IF NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
        IF OLD.has_invoice = TRUE THEN
            RAISE EXCEPTION 'Cannot cancel goods inward - linked to invoice. Delete or cancel invoice first'
                USING HINT = 'Delete or cancel the linked invoice before cancelling the goods inward';
        END IF;
    END IF;

    -- Rule 4: Cannot cancel if ANY stock unit has been dispatched
    IF NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
        IF EXISTS(
            SELECT 1 FROM stock_units
            WHERE created_from_inward_id = OLD.id
              AND has_outward = TRUE
              AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Cannot cancel goods inward - stock units from this inward have been dispatched. Delete outward records first'
                USING HINT = 'Delete or cancel all goods outward records containing stock units from this inward';
        END IF;
    END IF;

    -- Rule 5: Cannot edit critical fields if has invoice
    IF OLD.has_invoice = TRUE AND (
        NEW.partner_id IS DISTINCT FROM OLD.partner_id OR
        NEW.inward_date IS DISTINCT FROM OLD.inward_date OR
        NEW.inward_type IS DISTINCT FROM OLD.inward_type
    ) THEN
        RAISE EXCEPTION 'Cannot edit goods inward - linked to invoice. Critical fields are locked';
    END IF;

    -- Rule 6: Cannot edit critical fields if ANY stock unit has been dispatched
    IF EXISTS(
        SELECT 1 FROM stock_units
        WHERE created_from_inward_id = OLD.id
          AND has_outward = TRUE
          AND deleted_at IS NULL
    ) AND (
        NEW.partner_id IS DISTINCT FROM OLD.partner_id OR
        NEW.inward_date IS DISTINCT FROM OLD.inward_date OR
        NEW.inward_type IS DISTINCT FROM OLD.inward_type
    ) THEN
        RAISE EXCEPTION 'Cannot edit goods inward - stock units from this inward have been dispatched. Critical fields are locked';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_goods_inward_edit
    BEFORE UPDATE ON goods_inwards
    FOR EACH ROW
    EXECUTE FUNCTION prevent_goods_inward_edit();

COMMENT ON FUNCTION prevent_goods_inward_edit() IS 'Prevents editing goods inwards that are cancelled, deleted, or have critical field changes when invoiced or dispatched. Consolidates all edit validation rules including cancellation prevention.';

-- Prevent goods inward deletion in invalid states
CREATE OR REPLACE FUNCTION prevent_goods_inward_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete cancelled inwards (use soft delete)
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot delete cancelled goods inward. Use soft delete (deleted_at) instead';
    END IF;

    -- Rule 2: Cannot delete if deleted (already soft deleted)
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete goods inward - already soft deleted';
    END IF;

    -- Rule 3: Cannot delete if has invoice
    IF OLD.has_invoice = TRUE THEN
        RAISE EXCEPTION 'Cannot delete goods inward - linked to invoice';
    END IF;

    -- Note: CAN delete even if has stock units - cascade delete will handle it
    -- Stock units have ON DELETE CASCADE FK to goods_inwards

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_goods_inward_delete
    BEFORE DELETE ON goods_inwards
    FOR EACH ROW
    EXECUTE FUNCTION prevent_goods_inward_delete();

COMMENT ON FUNCTION prevent_goods_inward_delete() IS 'Prevents deleting cancelled, deleted, or invoiced goods inwards. Allows deletion with stock units (cascade handled by FK).';

-- =====================================================
-- GOODS OUTWARD GUARDS
-- =====================================================

-- Unified function to prevent editing goods outwards in invalid states
CREATE OR REPLACE FUNCTION prevent_goods_outward_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit cancelled outwards
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot edit goods outward - outward is cancelled';
    END IF;

    -- Rule 2: Cannot edit if deleted
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit goods outward - outward is deleted';
    END IF;

    -- Rule 3: Cannot cancel if has invoice
    IF NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
        IF OLD.has_invoice = TRUE THEN
            RAISE EXCEPTION 'Cannot cancel goods outward - linked to invoice. Delete or cancel invoice first'
                USING HINT = 'Delete or cancel the linked invoice before cancelling the goods outward';
        END IF;
    END IF;

    -- Rule 4: Cannot edit critical fields if has invoice
    IF OLD.has_invoice = TRUE AND (
        NEW.partner_id IS DISTINCT FROM OLD.partner_id OR
        NEW.outward_date IS DISTINCT FROM OLD.outward_date OR
        NEW.outward_type IS DISTINCT FROM OLD.outward_type
    ) THEN
        RAISE EXCEPTION 'Cannot edit goods outward - linked to invoice. Critical fields are locked';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_goods_outward_edit
    BEFORE UPDATE ON goods_outwards
    FOR EACH ROW
    EXECUTE FUNCTION prevent_goods_outward_edit();

COMMENT ON FUNCTION prevent_goods_outward_edit() IS 'Prevents editing goods outwards that are cancelled, deleted, or have critical field changes when invoiced. Consolidates all edit validation rules including cancellation prevention.';

-- Prevent goods outward deletion in invalid states
CREATE OR REPLACE FUNCTION prevent_goods_outward_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete cancelled outwards (use soft delete)
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot delete cancelled goods outward. Use soft delete (deleted_at) instead';
    END IF;

    -- Rule 2: Cannot delete if deleted (already soft deleted)
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete goods outward - already soft deleted';
    END IF;

    -- Rule 3: Cannot delete if has invoice
    IF OLD.has_invoice = TRUE THEN
        RAISE EXCEPTION 'Cannot delete goods outward - linked to invoice';
    END IF;

    -- Note: CAN delete even if has outward items - cascade delete will handle it
    -- Outward items have ON DELETE CASCADE FK to goods_outwards

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_goods_outward_delete
    BEFORE DELETE ON goods_outwards
    FOR EACH ROW
    EXECUTE FUNCTION prevent_goods_outward_delete();

COMMENT ON FUNCTION prevent_goods_outward_delete() IS 'Prevents deleting cancelled, deleted, or invoiced goods outwards. Allows deletion with outward items (cascade handled by FK).';

-- =====================================================
-- STOCK UNIT GUARDS
-- =====================================================

-- Unified function to prevent editing stock units in invalid states
CREATE OR REPLACE FUNCTION prevent_stock_unit_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit if deleted
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit stock unit - unit is deleted';
    END IF;

    -- Rule 2: Cannot edit if status is removed
    IF OLD.status = 'removed' THEN
        RAISE EXCEPTION 'Cannot edit stock unit - unit is removed';
    END IF;

    -- Rule 3: Cannot edit critical fields if unit has been dispatched
    IF OLD.has_outward = TRUE AND (
        NEW.product_id IS DISTINCT FROM OLD.product_id OR
        NEW.current_warehouse_id IS DISTINCT FROM OLD.current_warehouse_id OR
        NEW.created_from_inward_id IS DISTINCT FROM OLD.created_from_inward_id OR
        NEW.initial_quantity IS DISTINCT FROM OLD.initial_quantity
    ) THEN
        RAISE EXCEPTION 'Cannot edit stock unit - unit has been dispatched. Critical fields are locked';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_stock_unit_edit
    BEFORE UPDATE ON stock_units
    FOR EACH ROW
    EXECUTE FUNCTION prevent_stock_unit_edit();

COMMENT ON FUNCTION prevent_stock_unit_edit() IS 'Prevents editing stock units that are deleted, removed, or have critical field changes when dispatched. Allows editing quality_grade, location, notes, etc.';

-- Prevent stock unit deletion in invalid states
CREATE OR REPLACE FUNCTION prevent_stock_unit_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete if has been dispatched
    IF OLD.has_outward = TRUE THEN
        RAISE EXCEPTION 'Cannot delete stock unit - unit has outward history. Use soft delete (deleted_at) instead'
            USING HINT = 'Stock units that have been dispatched must retain audit trail';
    END IF;

    -- Rule 2: Cannot delete if deleted (already soft deleted)
    IF OLD.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete stock unit - already soft deleted';
    END IF;

    -- Rule 3: Cannot delete if status is removed
    IF OLD.status = 'removed' THEN
        RAISE EXCEPTION 'Cannot delete stock unit - unit is removed. Already conceptually deleted';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_stock_unit_delete
    BEFORE DELETE ON stock_units
    FOR EACH ROW
    EXECUTE FUNCTION prevent_stock_unit_delete();

COMMENT ON FUNCTION prevent_stock_unit_delete() IS 'Prevents deleting stock units that have outward history, are deleted, or removed. Maintains audit trail integrity.';
