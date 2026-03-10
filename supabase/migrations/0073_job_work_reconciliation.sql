-- Bale Backend - Job Work Reconciliation
-- Automatically maintain job work progress and status based on goods convert receipts

-- =====================================================
-- JOB WORK ITEMS RECONCILIATION FUNCTION
-- =====================================================

-- Reconcile job_work_items: update received_quantity from stock_units (goods_convert)
-- Triggered via BEFORE UPDATE on job_work_items (dummy update pattern from stock_units)
CREATE OR REPLACE FUNCTION reconcile_job_work_items()
RETURNS TRIGGER AS $$
DECLARE
    v_product_received DECIMAL(10,3);
BEGIN
    -- Calculate total received for this product from all completed converts linked to this job work
    SELECT COALESCE(SUM(su.initial_quantity), 0)
    INTO v_product_received
    FROM stock_units su
    INNER JOIN goods_converts gc ON gc.id = su.origin_convert_id
    WHERE gc.job_work_id = NEW.job_work_id
      AND su.product_id = NEW.product_id
      AND gc.deleted_at IS NULL
      AND su.deleted_at IS NULL
      AND gc.status = 'completed';

    -- Validate: prevent over-receipt
    IF v_product_received > NEW.expected_quantity THEN
        RAISE EXCEPTION 'Received quantity (%) exceeds expected quantity (%) for product in job work',
            v_product_received, NEW.expected_quantity;
    END IF;

    -- Update received_quantity
    NEW.received_quantity := v_product_received;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_job_work_items() IS 'Updates received_quantity for job_work_items based on stock_units from completed goods_converts. Validates against over-receipt.';

-- Trigger reconciliation on job_work_items BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_reconcile_job_work_items
    BEFORE INSERT OR UPDATE ON job_work_items
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_job_work_items();

-- =====================================================
-- JOB WORK RECONCILIATION FUNCTION
-- =====================================================

-- Reconcile job_work: has_convert flag, totals, GST
-- Triggered via BEFORE UPDATE on job_works (dummy update pattern from job_work_items)
CREATE OR REPLACE FUNCTION reconcile_job_work()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_has_any_convert BOOLEAN;
    v_subtotal DECIMAL(15,2);
    v_discount_amount DECIMAL(15,2);
    v_discounted_total DECIMAL(15,2);
    v_gst_amount DECIMAL(15,2);
    v_final_total DECIMAL(15,2);
    v_item_taxable_amount DECIMAL(10,2);
BEGIN
    -- Calculate subtotal from all line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM job_work_items
    WHERE job_work_id = NEW.id;

    -- Calculate discount amount based on type
    IF NEW.discount_type = 'none' THEN
        v_discount_amount := 0;
    ELSIF NEW.discount_type = 'percentage' THEN
        v_discount_amount := ROUND(v_subtotal * (COALESCE(NEW.discount_value, 0) / 100), 2);
    ELSIF NEW.discount_type = 'flat_amount' THEN
        v_discount_amount := ROUND(COALESCE(NEW.discount_value, 0), 2);
    ELSE
        v_discount_amount := 0;
    END IF;

    -- Calculate discounted total
    v_discounted_total := v_subtotal - v_discount_amount;

    -- Calculate GST amount from product-level rates
    v_gst_amount := 0;
    IF NEW.tax_type IN ('gst', 'igst') THEN
        FOR v_item IN
            SELECT
                jwi.line_total,
                COALESCE(p.gst_rate, 0) as product_gst_rate
            FROM job_work_items jwi
            INNER JOIN products p ON p.id = jwi.product_id
            WHERE jwi.job_work_id = NEW.id
        LOOP
            -- Calculate proportional discount for this item
            IF v_subtotal > 0 THEN
                v_item_taxable_amount := ROUND((v_item.line_total / v_subtotal) * v_discounted_total, 2);
            ELSE
                v_item_taxable_amount := 0;
            END IF;

            -- Add GST for this item
            v_gst_amount := v_gst_amount + ROUND(v_item_taxable_amount * (v_item.product_gst_rate / 100), 2);
        END LOOP;
    END IF;

    -- Calculate final total
    v_final_total := ROUND(v_discounted_total + v_gst_amount, 2);

    -- Update has_convert flag
    SELECT EXISTS(
        SELECT 1
        FROM goods_converts
        WHERE job_work_id = NEW.id
          AND deleted_at IS NULL
    ) INTO v_has_any_convert;

    -- Update NEW with all calculated values
    NEW.has_convert := v_has_any_convert;
    NEW.total_amount := v_final_total;
    NEW.gst_amount := v_gst_amount;
    NEW.discount_amount := v_discount_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_job_work() IS 'Calculates job work totals, GST, and has_convert flag. Does NOT update items.';

-- Trigger reconciliation on job_works BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_reconcile_job_work
    BEFORE INSERT OR UPDATE ON job_works
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_job_work();

-- =====================================================
-- TRIGGER JOB WORK RECONCILIATION FROM ITEMS CHANGES
-- =====================================================

-- Trigger reconciliation when job_work_items change
CREATE OR REPLACE FUNCTION trigger_job_work_reconciliation_from_items()
RETURNS TRIGGER AS $$
DECLARE
    v_job_work_id UUID;
BEGIN
    -- Get the affected job work ID
    v_job_work_id := COALESCE(NEW.job_work_id, OLD.job_work_id);

    -- Touch the job_work to trigger reconcile_job_work()
    UPDATE job_works
    SET updated_at = NOW()  -- Dummy update to trigger reconciliation
    WHERE id = v_job_work_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_job_work_from_items
    AFTER INSERT OR UPDATE OR DELETE ON job_work_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_job_work_reconciliation_from_items();

-- =====================================================
-- TRIGGER ITEM RECONCILIATION FROM GOODS CONVERT CHANGES
-- =====================================================

-- Trigger job_work_items reconciliation when stock_units from goods_convert change
CREATE OR REPLACE FUNCTION trigger_job_work_items_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_job_work_id UUID;
    v_product_id UUID;
BEGIN
    -- Get the affected job work ID and product from goods_convert
    IF TG_OP = 'DELETE' THEN
        IF OLD.origin_convert_id IS NOT NULL THEN
            SELECT gc.job_work_id
            INTO v_job_work_id
            FROM goods_converts gc
            WHERE gc.id = OLD.origin_convert_id;

            v_product_id := OLD.product_id;
        END IF;
    ELSE
        IF NEW.origin_convert_id IS NOT NULL THEN
            SELECT gc.job_work_id
            INTO v_job_work_id
            FROM goods_converts gc
            WHERE gc.id = NEW.origin_convert_id;

            v_product_id := NEW.product_id;
        END IF;
    END IF;

    -- Only reconcile if linked to a job work
    IF v_job_work_id IS NOT NULL AND v_product_id IS NOT NULL THEN
        -- Touch the job_work_item to trigger reconcile_job_work_items()
        UPDATE job_work_items
        SET updated_at = NOW()  -- Dummy update to trigger reconciliation
        WHERE job_work_id = v_job_work_id
          AND product_id = v_product_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT and DELETE to reconcile job work items
CREATE TRIGGER trigger_reconcile_job_work_items_on_convert_insert_delete
    AFTER INSERT OR DELETE ON stock_units
    FOR EACH ROW
    EXECUTE FUNCTION trigger_job_work_items_reconciliation();

-- Trigger for UPDATE to reconcile job work items, only when initial_quantity changes
CREATE TRIGGER trigger_reconcile_job_work_items_on_convert_update
    AFTER UPDATE ON stock_units
    FOR EACH ROW
    WHEN (OLD.initial_quantity IS DISTINCT FROM NEW.initial_quantity)
    EXECUTE FUNCTION trigger_job_work_items_reconciliation();

COMMENT ON FUNCTION trigger_job_work_items_reconciliation() IS 'Triggers job_work_items reconciliation when stock_units from goods_convert are created, updated, or deleted';

-- =====================================================
-- TRIGGER JOB WORK RECONCILIATION FROM GOODS CONVERT CHANGES
-- =====================================================

-- Trigger job work reconciliation when goods_converts are linked/unlinked/soft-deleted
CREATE OR REPLACE FUNCTION trigger_job_work_reconciliation_from_convert()
RETURNS TRIGGER AS $$
DECLARE
    v_job_work_id UUID;
BEGIN
    v_job_work_id := COALESCE(NEW.job_work_id, OLD.job_work_id);

    IF v_job_work_id IS NOT NULL THEN
        -- Touch the job_work to trigger reconcile_job_work()
        UPDATE job_works
        SET updated_at = NOW()
        WHERE id = v_job_work_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for INSERT and DELETE
CREATE TRIGGER trigger_reconcile_job_work_from_convert_insert_delete
    AFTER INSERT OR DELETE ON goods_converts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_job_work_reconciliation_from_convert();

-- Trigger for UPDATE, only when job_work_id or deleted_at changes (link/unlink/soft-delete)
CREATE TRIGGER trigger_reconcile_job_work_from_convert_update
    AFTER UPDATE ON goods_converts
    FOR EACH ROW
    WHEN (OLD.job_work_id IS DISTINCT FROM NEW.job_work_id
       OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
    EXECUTE FUNCTION trigger_job_work_reconciliation_from_convert();

COMMENT ON FUNCTION trigger_job_work_reconciliation_from_convert() IS 'Triggers job work reconciliation when goods_converts are created, linked, unlinked, or soft-deleted';

-- =====================================================
-- VALIDATION: PREVENT CONVERT FOR NON-APPROVED JOB WORKS
-- =====================================================

-- Prevent creating goods_convert linked to a job work not in 'in_progress' status
CREATE OR REPLACE FUNCTION validate_job_work_status_for_convert()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status VARCHAR(20);
    v_deleted_at TIMESTAMPTZ;
BEGIN
    -- Only validate if linked to a job work
    IF NEW.job_work_id IS NOT NULL THEN
        -- Get job work status and deleted_at
        SELECT status, deleted_at
        INTO v_order_status, v_deleted_at
        FROM job_works
        WHERE id = NEW.job_work_id;

        -- Check if job work is deleted
        IF v_deleted_at IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot create goods convert for deleted job work';
        END IF;

        -- Only allow convert for approved (in_progress) job works
        IF v_order_status != 'in_progress' THEN
            RAISE EXCEPTION 'Cannot create goods convert for job work with status "%". Job work must be approved (in_progress) first.',
                v_order_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_job_work_status_for_convert
    BEFORE INSERT ON goods_converts
    FOR EACH ROW EXECUTE FUNCTION validate_job_work_status_for_convert();

COMMENT ON FUNCTION validate_job_work_status_for_convert() IS 'Prevents creating goods convert for job works that are not in in_progress status';

-- =====================================================
-- VALIDATION: PREVENT EDIT/DELETE OF JOB WORKS
-- =====================================================

-- Unified function to prevent editing job works in invalid states
CREATE OR REPLACE FUNCTION prevent_job_work_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit cancelled job works
    IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot edit job work - job work is cancelled';
    END IF;

    -- Rule 2: Cannot edit completed job works
    IF OLD.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot edit job work - job work is completed';
    END IF;

    -- Rule 3: Cannot cancel if has goods convert
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        IF OLD.has_convert = TRUE THEN
            RAISE EXCEPTION 'Cannot cancel job work - goods convert exists. Delete all goods convert records first'
                USING HINT = 'Delete all linked goods convert records before cancelling the job work';
        END IF;
    END IF;

    -- Rule 4: Cannot change vendor after approval
    IF NEW.vendor_id IS DISTINCT FROM OLD.vendor_id AND OLD.status != 'approval_pending' THEN
        RAISE EXCEPTION 'Cannot change vendor after job work approval';
    END IF;

    -- Rule 5: Cannot edit warehouse/start_date if has goods convert
    IF OLD.has_convert = TRUE AND (
        NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id OR
        NEW.start_date IS DISTINCT FROM OLD.start_date
    ) THEN
        RAISE EXCEPTION 'Cannot edit warehouse or start date - goods convert exists. Delete convert records first';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_job_work_edit
    BEFORE UPDATE ON job_works
    FOR EACH ROW
    EXECUTE FUNCTION prevent_job_work_edit();

COMMENT ON FUNCTION prevent_job_work_edit() IS 'Prevents editing job works that are cancelled or completed. Prevents changing vendor after approval. Prevents changing warehouse/start_date if goods convert exists.';

-- Prevent job work deletion in invalid states
CREATE OR REPLACE FUNCTION prevent_job_work_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete cancelled job works (use soft delete)
    IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot delete cancelled job work. Use soft delete (deleted_at) instead';
    END IF;

    -- Rule 2: Cannot delete completed job works
    IF OLD.status = 'completed' THEN
        RAISE EXCEPTION 'Cannot delete completed job work. Use soft delete (deleted_at) instead';
    END IF;

    -- Rule 3: Cannot delete if has goods convert
    IF OLD.has_convert = TRUE THEN
        RAISE EXCEPTION 'Cannot delete job work - goods convert exists. Delete convert records first';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_job_work_delete
    BEFORE DELETE ON job_works
    FOR EACH ROW
    EXECUTE FUNCTION prevent_job_work_delete();

COMMENT ON FUNCTION prevent_job_work_delete() IS 'Prevents deleting job works that are cancelled, completed, or have linked goods convert records';

COMMENT ON TRIGGER trigger_reconcile_job_work ON job_works IS 'Calculates job work totals, GST, and has_convert flag. Triggered by dummy updates from job_work_items changes.';
COMMENT ON TRIGGER trigger_reconcile_job_work_items ON job_work_items IS 'Updates received_quantity from stock_units. Triggered by dummy updates from stock_units changes.';
