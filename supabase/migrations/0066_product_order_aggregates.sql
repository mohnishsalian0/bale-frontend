-- Product Order Aggregates Tables
-- Tracks order metrics per product at company level, segregated by order status
-- Includes both quantity and financial metrics for comprehensive analytics

-- =====================================================
-- PRODUCT SALES ORDER AGGREGATES
-- =====================================================

CREATE TABLE product_sales_order_aggregates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Order counts by status
    approval_pending_count INTEGER DEFAULT 0,
    in_progress_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    cancelled_count INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,

    -- Approval Pending metrics (orders awaiting approval)
    approval_pending_required_quantity NUMERIC(15,3) DEFAULT 0,
    approval_pending_dispatched_quantity NUMERIC(15,3) DEFAULT 0,  -- Should be 0 (bug detector)
    approval_pending_pending_quantity NUMERIC(15,3) DEFAULT 0,
    approval_pending_required_value NUMERIC(15,2) DEFAULT 0,
    approval_pending_dispatched_value NUMERIC(15,2) DEFAULT 0,     -- Should be 0 (bug detector)
    approval_pending_pending_value NUMERIC(15,2) DEFAULT 0,

    -- In Progress metrics (orders being fulfilled)
    in_progress_required_quantity NUMERIC(15,3) DEFAULT 0,
    in_progress_dispatched_quantity NUMERIC(15,3) DEFAULT 0,
    in_progress_pending_quantity NUMERIC(15,3) DEFAULT 0,
    in_progress_required_value NUMERIC(15,2) DEFAULT 0,
    in_progress_dispatched_value NUMERIC(15,2) DEFAULT 0,
    in_progress_pending_value NUMERIC(15,2) DEFAULT 0,

    -- Completed metrics (orders fully fulfilled)
    completed_required_quantity NUMERIC(15,3) DEFAULT 0,
    completed_dispatched_quantity NUMERIC(15,3) DEFAULT 0,
    completed_pending_quantity NUMERIC(15,3) DEFAULT 0,             -- Should be 0 (bug detector)
    completed_required_value NUMERIC(15,2) DEFAULT 0,
    completed_dispatched_value NUMERIC(15,2) DEFAULT 0,
    completed_pending_value NUMERIC(15,2) DEFAULT 0,                -- Should be 0 (bug detector)

    -- Cancelled metrics (cancelled orders)
    cancelled_required_quantity NUMERIC(15,3) DEFAULT 0,
    cancelled_dispatched_quantity NUMERIC(15,3) DEFAULT 0,
    cancelled_pending_quantity NUMERIC(15,3) DEFAULT 0,
    cancelled_required_value NUMERIC(15,2) DEFAULT 0,
    cancelled_dispatched_value NUMERIC(15,2) DEFAULT 0,
    cancelled_pending_value NUMERIC(15,2) DEFAULT 0,

    -- Active metrics (approval_pending + in_progress = real demand)
    active_required_quantity NUMERIC(15,3) DEFAULT 0,
    active_dispatched_quantity NUMERIC(15,3) DEFAULT 0,
    active_pending_quantity NUMERIC(15,3) DEFAULT 0,
    active_required_value NUMERIC(15,2) DEFAULT 0,
    active_dispatched_value NUMERIC(15,2) DEFAULT 0,
    active_pending_value NUMERIC(15,2) DEFAULT 0,

    -- Date tracking
    first_order_date TIMESTAMPTZ,
    last_order_date TIMESTAMPTZ,

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(product_id, company_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_product_sales_agg_product ON product_sales_order_aggregates(product_id);
CREATE INDEX idx_product_sales_agg_company ON product_sales_order_aggregates(company_id);
CREATE INDEX idx_product_sales_agg_active_demand ON product_sales_order_aggregates(company_id, active_pending_quantity DESC) WHERE active_pending_quantity > 0;


-- =====================================================
-- PRODUCT PURCHASE ORDER AGGREGATES
-- =====================================================

CREATE TABLE product_purchase_order_aggregates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Order counts by status
    approval_pending_count INTEGER DEFAULT 0,
    in_progress_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    cancelled_count INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,

    -- Approval Pending metrics (orders awaiting approval)
    approval_pending_required_quantity NUMERIC(15,3) DEFAULT 0,
    approval_pending_received_quantity NUMERIC(15,3) DEFAULT 0,     -- Should be 0 (bug detector)
    approval_pending_pending_quantity NUMERIC(15,3) DEFAULT 0,
    approval_pending_required_value NUMERIC(15,2) DEFAULT 0,
    approval_pending_received_value NUMERIC(15,2) DEFAULT 0,        -- Should be 0 (bug detector)
    approval_pending_pending_value NUMERIC(15,2) DEFAULT 0,

    -- In Progress metrics (orders being received)
    in_progress_required_quantity NUMERIC(15,3) DEFAULT 0,
    in_progress_received_quantity NUMERIC(15,3) DEFAULT 0,
    in_progress_pending_quantity NUMERIC(15,3) DEFAULT 0,
    in_progress_required_value NUMERIC(15,2) DEFAULT 0,
    in_progress_received_value NUMERIC(15,2) DEFAULT 0,
    in_progress_pending_value NUMERIC(15,2) DEFAULT 0,

    -- Completed metrics (orders fully received)
    completed_required_quantity NUMERIC(15,3) DEFAULT 0,
    completed_received_quantity NUMERIC(15,3) DEFAULT 0,
    completed_pending_quantity NUMERIC(15,3) DEFAULT 0,             -- Should be 0 (bug detector)
    completed_required_value NUMERIC(15,2) DEFAULT 0,
    completed_received_value NUMERIC(15,2) DEFAULT 0,
    completed_pending_value NUMERIC(15,2) DEFAULT 0,                -- Should be 0 (bug detector)

    -- Cancelled metrics (cancelled orders)
    cancelled_required_quantity NUMERIC(15,3) DEFAULT 0,
    cancelled_received_quantity NUMERIC(15,3) DEFAULT 0,
    cancelled_pending_quantity NUMERIC(15,3) DEFAULT 0,
    cancelled_required_value NUMERIC(15,2) DEFAULT 0,
    cancelled_received_value NUMERIC(15,2) DEFAULT 0,
    cancelled_pending_value NUMERIC(15,2) DEFAULT 0,

    -- Active metrics (approval_pending + in_progress = real demand)
    active_required_quantity NUMERIC(15,3) DEFAULT 0,
    active_received_quantity NUMERIC(15,3) DEFAULT 0,
    active_pending_quantity NUMERIC(15,3) DEFAULT 0,
    active_required_value NUMERIC(15,2) DEFAULT 0,
    active_received_value NUMERIC(15,2) DEFAULT 0,
    active_pending_value NUMERIC(15,2) DEFAULT 0,

    -- Date tracking
    first_order_date TIMESTAMPTZ,
    last_order_date TIMESTAMPTZ,

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(product_id, company_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_product_purchase_agg_product ON product_purchase_order_aggregates(product_id);
CREATE INDEX idx_product_purchase_agg_company ON product_purchase_order_aggregates(company_id);
CREATE INDEX idx_product_purchase_agg_active_demand ON product_purchase_order_aggregates(company_id, active_pending_quantity DESC) WHERE active_pending_quantity > 0;


-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE product_sales_order_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_purchase_order_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view product sales order aggregates"
ON product_sales_order_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('sales_orders.read')
);

CREATE POLICY "Authorized users can view product purchase order aggregates"
ON product_purchase_order_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('purchase_orders.read')
);


-- =====================================================
-- RECALCULATION FUNCTIONS
-- =====================================================

-- Function to recalculate product sales order aggregates
CREATE OR REPLACE FUNCTION recalculate_product_sales_order_aggregates(
    p_product_id UUID,
    p_company_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_approval_pending_count INTEGER;
    v_in_progress_count INTEGER;
    v_completed_count INTEGER;
    v_cancelled_count INTEGER;
    v_total_orders INTEGER;

    -- Approval pending metrics
    v_ap_req_qty NUMERIC(15,3);
    v_ap_disp_qty NUMERIC(15,3);
    v_ap_pend_qty NUMERIC(15,3);
    v_ap_req_val NUMERIC(15,2);
    v_ap_disp_val NUMERIC(15,2);
    v_ap_pend_val NUMERIC(15,2);

    -- In progress metrics
    v_ip_req_qty NUMERIC(15,3);
    v_ip_disp_qty NUMERIC(15,3);
    v_ip_pend_qty NUMERIC(15,3);
    v_ip_req_val NUMERIC(15,2);
    v_ip_disp_val NUMERIC(15,2);
    v_ip_pend_val NUMERIC(15,2);

    -- Completed metrics
    v_comp_req_qty NUMERIC(15,3);
    v_comp_disp_qty NUMERIC(15,3);
    v_comp_pend_qty NUMERIC(15,3);
    v_comp_req_val NUMERIC(15,2);
    v_comp_disp_val NUMERIC(15,2);
    v_comp_pend_val NUMERIC(15,2);

    -- Cancelled metrics
    v_canc_req_qty NUMERIC(15,3);
    v_canc_disp_qty NUMERIC(15,3);
    v_canc_pend_qty NUMERIC(15,3);
    v_canc_req_val NUMERIC(15,2);
    v_canc_disp_val NUMERIC(15,2);
    v_canc_pend_val NUMERIC(15,2);

    -- Date tracking
    v_first_order_date TIMESTAMPTZ;
    v_last_order_date TIMESTAMPTZ;
BEGIN
    -- Calculate order counts by status
    SELECT
        COUNT(*) FILTER (WHERE status = 'approval_pending'),
        COUNT(*) FILTER (WHERE status = 'in_progress'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*)
    INTO
        v_approval_pending_count,
        v_in_progress_count,
        v_completed_count,
        v_cancelled_count,
        v_total_orders
    FROM sales_orders so
    WHERE so.company_id = p_company_id
        AND so.deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM sales_order_items soi
            WHERE soi.sales_order_id = so.id
                AND soi.product_id = p_product_id
        );

    -- Calculate approval_pending metrics
    SELECT
        COALESCE(SUM(soi.required_quantity), 0),
        COALESCE(SUM(soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.pending_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.required_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.pending_quantity), 0)
    INTO
        v_ap_req_qty, v_ap_disp_qty, v_ap_pend_qty,
        v_ap_req_val, v_ap_disp_val, v_ap_pend_val
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.sales_order_id
    WHERE soi.product_id = p_product_id
        AND so.company_id = p_company_id
        AND so.status = 'approval_pending'
        AND so.deleted_at IS NULL;

    -- Calculate in_progress metrics
    SELECT
        COALESCE(SUM(soi.required_quantity), 0),
        COALESCE(SUM(soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.pending_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.required_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.pending_quantity), 0)
    INTO
        v_ip_req_qty, v_ip_disp_qty, v_ip_pend_qty,
        v_ip_req_val, v_ip_disp_val, v_ip_pend_val
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.sales_order_id
    WHERE soi.product_id = p_product_id
        AND so.company_id = p_company_id
        AND so.status = 'in_progress'
        AND so.deleted_at IS NULL;

    -- Calculate completed metrics
    SELECT
        COALESCE(SUM(soi.required_quantity), 0),
        COALESCE(SUM(soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.pending_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.required_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.pending_quantity), 0)
    INTO
        v_comp_req_qty, v_comp_disp_qty, v_comp_pend_qty,
        v_comp_req_val, v_comp_disp_val, v_comp_pend_val
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.sales_order_id
    WHERE soi.product_id = p_product_id
        AND so.company_id = p_company_id
        AND so.status = 'completed'
        AND so.deleted_at IS NULL;

    -- Calculate cancelled metrics
    SELECT
        COALESCE(SUM(soi.required_quantity), 0),
        COALESCE(SUM(soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.pending_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.required_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.dispatched_quantity), 0),
        COALESCE(SUM(soi.unit_rate * soi.pending_quantity), 0)
    INTO
        v_canc_req_qty, v_canc_disp_qty, v_canc_pend_qty,
        v_canc_req_val, v_canc_disp_val, v_canc_pend_val
    FROM sales_order_items soi
    JOIN sales_orders so ON so.id = soi.sales_order_id
    WHERE soi.product_id = p_product_id
        AND so.company_id = p_company_id
        AND so.status = 'cancelled'
        AND so.deleted_at IS NULL;

    -- Calculate date tracking
    SELECT
        MIN(so.order_date),
        MAX(so.order_date)
    INTO
        v_first_order_date,
        v_last_order_date
    FROM sales_orders so
    WHERE so.company_id = p_company_id
        AND so.deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM sales_order_items soi
            WHERE soi.sales_order_id = so.id
                AND soi.product_id = p_product_id
        );

    -- Upsert into aggregates table
    INSERT INTO product_sales_order_aggregates (
        product_id,
        company_id,
        approval_pending_count,
        in_progress_count,
        completed_count,
        cancelled_count,
        total_orders,
        approval_pending_required_quantity,
        approval_pending_dispatched_quantity,
        approval_pending_pending_quantity,
        approval_pending_required_value,
        approval_pending_dispatched_value,
        approval_pending_pending_value,
        in_progress_required_quantity,
        in_progress_dispatched_quantity,
        in_progress_pending_quantity,
        in_progress_required_value,
        in_progress_dispatched_value,
        in_progress_pending_value,
        completed_required_quantity,
        completed_dispatched_quantity,
        completed_pending_quantity,
        completed_required_value,
        completed_dispatched_value,
        completed_pending_value,
        cancelled_required_quantity,
        cancelled_dispatched_quantity,
        cancelled_pending_quantity,
        cancelled_required_value,
        cancelled_dispatched_value,
        cancelled_pending_value,
        active_required_quantity,
        active_dispatched_quantity,
        active_pending_quantity,
        active_required_value,
        active_dispatched_value,
        active_pending_value,
        first_order_date,
        last_order_date,
        last_updated_at
    ) VALUES (
        p_product_id,
        p_company_id,
        v_approval_pending_count,
        v_in_progress_count,
        v_completed_count,
        v_cancelled_count,
        v_total_orders,
        v_ap_req_qty,
        v_ap_disp_qty,
        v_ap_pend_qty,
        v_ap_req_val,
        v_ap_disp_val,
        v_ap_pend_val,
        v_ip_req_qty,
        v_ip_disp_qty,
        v_ip_pend_qty,
        v_ip_req_val,
        v_ip_disp_val,
        v_ip_pend_val,
        v_comp_req_qty,
        v_comp_disp_qty,
        v_comp_pend_qty,
        v_comp_req_val,
        v_comp_disp_val,
        v_comp_pend_val,
        v_canc_req_qty,
        v_canc_disp_qty,
        v_canc_pend_qty,
        v_canc_req_val,
        v_canc_disp_val,
        v_canc_pend_val,
        v_ap_req_qty + v_ip_req_qty,      -- active_required_quantity
        v_ap_disp_qty + v_ip_disp_qty,    -- active_dispatched_quantity
        v_ap_pend_qty + v_ip_pend_qty,    -- active_pending_quantity
        v_ap_req_val + v_ip_req_val,      -- active_required_value
        v_ap_disp_val + v_ip_disp_val,    -- active_dispatched_value
        v_ap_pend_val + v_ip_pend_val,    -- active_pending_value
        v_first_order_date,
        v_last_order_date,
        NOW()
    )
    ON CONFLICT (product_id, company_id)
    DO UPDATE SET
        approval_pending_count = EXCLUDED.approval_pending_count,
        in_progress_count = EXCLUDED.in_progress_count,
        completed_count = EXCLUDED.completed_count,
        cancelled_count = EXCLUDED.cancelled_count,
        total_orders = EXCLUDED.total_orders,
        approval_pending_required_quantity = EXCLUDED.approval_pending_required_quantity,
        approval_pending_dispatched_quantity = EXCLUDED.approval_pending_dispatched_quantity,
        approval_pending_pending_quantity = EXCLUDED.approval_pending_pending_quantity,
        approval_pending_required_value = EXCLUDED.approval_pending_required_value,
        approval_pending_dispatched_value = EXCLUDED.approval_pending_dispatched_value,
        approval_pending_pending_value = EXCLUDED.approval_pending_pending_value,
        in_progress_required_quantity = EXCLUDED.in_progress_required_quantity,
        in_progress_dispatched_quantity = EXCLUDED.in_progress_dispatched_quantity,
        in_progress_pending_quantity = EXCLUDED.in_progress_pending_quantity,
        in_progress_required_value = EXCLUDED.in_progress_required_value,
        in_progress_dispatched_value = EXCLUDED.in_progress_dispatched_value,
        in_progress_pending_value = EXCLUDED.in_progress_pending_value,
        completed_required_quantity = EXCLUDED.completed_required_quantity,
        completed_dispatched_quantity = EXCLUDED.completed_dispatched_quantity,
        completed_pending_quantity = EXCLUDED.completed_pending_quantity,
        completed_required_value = EXCLUDED.completed_required_value,
        completed_dispatched_value = EXCLUDED.completed_dispatched_value,
        completed_pending_value = EXCLUDED.completed_pending_value,
        cancelled_required_quantity = EXCLUDED.cancelled_required_quantity,
        cancelled_dispatched_quantity = EXCLUDED.cancelled_dispatched_quantity,
        cancelled_pending_quantity = EXCLUDED.cancelled_pending_quantity,
        cancelled_required_value = EXCLUDED.cancelled_required_value,
        cancelled_dispatched_value = EXCLUDED.cancelled_dispatched_value,
        cancelled_pending_value = EXCLUDED.cancelled_pending_value,
        active_required_quantity = EXCLUDED.active_required_quantity,
        active_dispatched_quantity = EXCLUDED.active_dispatched_quantity,
        active_pending_quantity = EXCLUDED.active_pending_quantity,
        active_required_value = EXCLUDED.active_required_value,
        active_dispatched_value = EXCLUDED.active_dispatched_value,
        active_pending_value = EXCLUDED.active_pending_value,
        first_order_date = EXCLUDED.first_order_date,
        last_order_date = EXCLUDED.last_order_date,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to recalculate product purchase order aggregates
CREATE OR REPLACE FUNCTION recalculate_product_purchase_order_aggregates(
    p_product_id UUID,
    p_company_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_approval_pending_count INTEGER;
    v_in_progress_count INTEGER;
    v_completed_count INTEGER;
    v_cancelled_count INTEGER;
    v_total_orders INTEGER;

    -- Approval pending metrics
    v_ap_req_qty NUMERIC(15,3);
    v_ap_recv_qty NUMERIC(15,3);
    v_ap_pend_qty NUMERIC(15,3);
    v_ap_req_val NUMERIC(15,2);
    v_ap_recv_val NUMERIC(15,2);
    v_ap_pend_val NUMERIC(15,2);

    -- In progress metrics
    v_ip_req_qty NUMERIC(15,3);
    v_ip_recv_qty NUMERIC(15,3);
    v_ip_pend_qty NUMERIC(15,3);
    v_ip_req_val NUMERIC(15,2);
    v_ip_recv_val NUMERIC(15,2);
    v_ip_pend_val NUMERIC(15,2);

    -- Completed metrics
    v_comp_req_qty NUMERIC(15,3);
    v_comp_recv_qty NUMERIC(15,3);
    v_comp_pend_qty NUMERIC(15,3);
    v_comp_req_val NUMERIC(15,2);
    v_comp_recv_val NUMERIC(15,2);
    v_comp_pend_val NUMERIC(15,2);

    -- Cancelled metrics
    v_canc_req_qty NUMERIC(15,3);
    v_canc_recv_qty NUMERIC(15,3);
    v_canc_pend_qty NUMERIC(15,3);
    v_canc_req_val NUMERIC(15,2);
    v_canc_recv_val NUMERIC(15,2);
    v_canc_pend_val NUMERIC(15,2);

    -- Date tracking
    v_first_order_date TIMESTAMPTZ;
    v_last_order_date TIMESTAMPTZ;
BEGIN
    -- Calculate order counts by status
    SELECT
        COUNT(*) FILTER (WHERE status = 'approval_pending'),
        COUNT(*) FILTER (WHERE status = 'in_progress'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*)
    INTO
        v_approval_pending_count,
        v_in_progress_count,
        v_completed_count,
        v_cancelled_count,
        v_total_orders
    FROM purchase_orders po
    WHERE po.company_id = p_company_id
        AND po.deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM purchase_order_items poi
            WHERE poi.purchase_order_id = po.id
                AND poi.product_id = p_product_id
        );

    -- Calculate approval_pending metrics
    SELECT
        COALESCE(SUM(poi.required_quantity), 0),
        COALESCE(SUM(poi.received_quantity), 0),
        COALESCE(SUM(poi.pending_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.required_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.received_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.pending_quantity), 0)
    INTO
        v_ap_req_qty, v_ap_recv_qty, v_ap_pend_qty,
        v_ap_req_val, v_ap_recv_val, v_ap_pend_val
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE poi.product_id = p_product_id
        AND po.company_id = p_company_id
        AND po.status = 'approval_pending'
        AND po.deleted_at IS NULL;

    -- Calculate in_progress metrics
    SELECT
        COALESCE(SUM(poi.required_quantity), 0),
        COALESCE(SUM(poi.received_quantity), 0),
        COALESCE(SUM(poi.pending_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.required_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.received_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.pending_quantity), 0)
    INTO
        v_ip_req_qty, v_ip_recv_qty, v_ip_pend_qty,
        v_ip_req_val, v_ip_recv_val, v_ip_pend_val
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE poi.product_id = p_product_id
        AND po.company_id = p_company_id
        AND po.status = 'in_progress'
        AND po.deleted_at IS NULL;

    -- Calculate completed metrics
    SELECT
        COALESCE(SUM(poi.required_quantity), 0),
        COALESCE(SUM(poi.received_quantity), 0),
        COALESCE(SUM(poi.pending_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.required_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.received_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.pending_quantity), 0)
    INTO
        v_comp_req_qty, v_comp_recv_qty, v_comp_pend_qty,
        v_comp_req_val, v_comp_recv_val, v_comp_pend_val
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE poi.product_id = p_product_id
        AND po.company_id = p_company_id
        AND po.status = 'completed'
        AND po.deleted_at IS NULL;

    -- Calculate cancelled metrics
    SELECT
        COALESCE(SUM(poi.required_quantity), 0),
        COALESCE(SUM(poi.received_quantity), 0),
        COALESCE(SUM(poi.pending_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.required_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.received_quantity), 0),
        COALESCE(SUM(poi.unit_rate * poi.pending_quantity), 0)
    INTO
        v_canc_req_qty, v_canc_recv_qty, v_canc_pend_qty,
        v_canc_req_val, v_canc_recv_val, v_canc_pend_val
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE poi.product_id = p_product_id
        AND po.company_id = p_company_id
        AND po.status = 'cancelled'
        AND po.deleted_at IS NULL;

    -- Calculate date tracking
    SELECT
        MIN(po.order_date),
        MAX(po.order_date)
    INTO
        v_first_order_date,
        v_last_order_date
    FROM purchase_orders po
    WHERE po.company_id = p_company_id
        AND po.deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM purchase_order_items poi
            WHERE poi.purchase_order_id = po.id
                AND poi.product_id = p_product_id
        );

    -- Upsert into aggregates table
    INSERT INTO product_purchase_order_aggregates (
        product_id,
        company_id,
        approval_pending_count,
        in_progress_count,
        completed_count,
        cancelled_count,
        total_orders,
        approval_pending_required_quantity,
        approval_pending_received_quantity,
        approval_pending_pending_quantity,
        approval_pending_required_value,
        approval_pending_received_value,
        approval_pending_pending_value,
        in_progress_required_quantity,
        in_progress_received_quantity,
        in_progress_pending_quantity,
        in_progress_required_value,
        in_progress_received_value,
        in_progress_pending_value,
        completed_required_quantity,
        completed_received_quantity,
        completed_pending_quantity,
        completed_required_value,
        completed_received_value,
        completed_pending_value,
        cancelled_required_quantity,
        cancelled_received_quantity,
        cancelled_pending_quantity,
        cancelled_required_value,
        cancelled_received_value,
        cancelled_pending_value,
        active_required_quantity,
        active_received_quantity,
        active_pending_quantity,
        active_required_value,
        active_received_value,
        active_pending_value,
        first_order_date,
        last_order_date,
        last_updated_at
    ) VALUES (
        p_product_id,
        p_company_id,
        v_approval_pending_count,
        v_in_progress_count,
        v_completed_count,
        v_cancelled_count,
        v_total_orders,
        v_ap_req_qty,
        v_ap_recv_qty,
        v_ap_pend_qty,
        v_ap_req_val,
        v_ap_recv_val,
        v_ap_pend_val,
        v_ip_req_qty,
        v_ip_recv_qty,
        v_ip_pend_qty,
        v_ip_req_val,
        v_ip_recv_val,
        v_ip_pend_val,
        v_comp_req_qty,
        v_comp_recv_qty,
        v_comp_pend_qty,
        v_comp_req_val,
        v_comp_recv_val,
        v_comp_pend_val,
        v_canc_req_qty,
        v_canc_recv_qty,
        v_canc_pend_qty,
        v_canc_req_val,
        v_canc_recv_val,
        v_canc_pend_val,
        v_ap_req_qty + v_ip_req_qty,      -- active_required_quantity
        v_ap_recv_qty + v_ip_recv_qty,    -- active_received_quantity
        v_ap_pend_qty + v_ip_pend_qty,    -- active_pending_quantity
        v_ap_req_val + v_ip_req_val,      -- active_required_value
        v_ap_recv_val + v_ip_recv_val,    -- active_received_value
        v_ap_pend_val + v_ip_pend_val,    -- active_pending_value
        v_first_order_date,
        v_last_order_date,
        NOW()
    )
    ON CONFLICT (product_id, company_id)
    DO UPDATE SET
        approval_pending_count = EXCLUDED.approval_pending_count,
        in_progress_count = EXCLUDED.in_progress_count,
        completed_count = EXCLUDED.completed_count,
        cancelled_count = EXCLUDED.cancelled_count,
        total_orders = EXCLUDED.total_orders,
        approval_pending_required_quantity = EXCLUDED.approval_pending_required_quantity,
        approval_pending_received_quantity = EXCLUDED.approval_pending_received_quantity,
        approval_pending_pending_quantity = EXCLUDED.approval_pending_pending_quantity,
        approval_pending_required_value = EXCLUDED.approval_pending_required_value,
        approval_pending_received_value = EXCLUDED.approval_pending_received_value,
        approval_pending_pending_value = EXCLUDED.approval_pending_pending_value,
        in_progress_required_quantity = EXCLUDED.in_progress_required_quantity,
        in_progress_received_quantity = EXCLUDED.in_progress_received_quantity,
        in_progress_pending_quantity = EXCLUDED.in_progress_pending_quantity,
        in_progress_required_value = EXCLUDED.in_progress_required_value,
        in_progress_received_value = EXCLUDED.in_progress_received_value,
        in_progress_pending_value = EXCLUDED.in_progress_pending_value,
        completed_required_quantity = EXCLUDED.completed_required_quantity,
        completed_received_quantity = EXCLUDED.completed_received_quantity,
        completed_pending_quantity = EXCLUDED.completed_pending_quantity,
        completed_required_value = EXCLUDED.completed_required_value,
        completed_received_value = EXCLUDED.completed_received_value,
        completed_pending_value = EXCLUDED.completed_pending_value,
        cancelled_required_quantity = EXCLUDED.cancelled_required_quantity,
        cancelled_received_quantity = EXCLUDED.cancelled_received_quantity,
        cancelled_pending_quantity = EXCLUDED.cancelled_pending_quantity,
        cancelled_required_value = EXCLUDED.cancelled_required_value,
        cancelled_received_value = EXCLUDED.cancelled_received_value,
        cancelled_pending_value = EXCLUDED.cancelled_pending_value,
        active_required_quantity = EXCLUDED.active_required_quantity,
        active_received_quantity = EXCLUDED.active_received_quantity,
        active_pending_quantity = EXCLUDED.active_pending_quantity,
        active_required_value = EXCLUDED.active_required_value,
        active_received_value = EXCLUDED.active_received_value,
        active_pending_value = EXCLUDED.active_pending_value,
        first_order_date = EXCLUDED.first_order_date,
        last_order_date = EXCLUDED.last_order_date,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Trigger function to update sales order aggregates when order items change
CREATE OR REPLACE FUNCTION trigger_update_product_sales_order_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get company_id from the sales order
    IF TG_OP = 'DELETE' THEN
        SELECT company_id INTO v_company_id
        FROM sales_orders
        WHERE id = OLD.sales_order_id;

        IF v_company_id IS NOT NULL THEN
            PERFORM recalculate_product_sales_order_aggregates(OLD.product_id, v_company_id);
        END IF;
    ELSE
        SELECT company_id INTO v_company_id
        FROM sales_orders
        WHERE id = NEW.sales_order_id;

        IF v_company_id IS NOT NULL THEN
            PERFORM recalculate_product_sales_order_aggregates(NEW.product_id, v_company_id);
        END IF;

        -- Handle product_id change in UPDATE
        IF TG_OP = 'UPDATE' AND OLD.product_id != NEW.product_id THEN
            PERFORM recalculate_product_sales_order_aggregates(OLD.product_id, v_company_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update purchase order aggregates when order items change
CREATE OR REPLACE FUNCTION trigger_update_product_purchase_order_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get company_id from the purchase order
    IF TG_OP = 'DELETE' THEN
        SELECT company_id INTO v_company_id
        FROM purchase_orders
        WHERE id = OLD.purchase_order_id;

        IF v_company_id IS NOT NULL THEN
            PERFORM recalculate_product_purchase_order_aggregates(OLD.product_id, v_company_id);
        END IF;
    ELSE
        SELECT company_id INTO v_company_id
        FROM purchase_orders
        WHERE id = NEW.purchase_order_id;

        IF v_company_id IS NOT NULL THEN
            PERFORM recalculate_product_purchase_order_aggregates(NEW.product_id, v_company_id);
        END IF;

        -- Handle product_id change in UPDATE
        IF TG_OP = 'UPDATE' AND OLD.product_id != NEW.product_id THEN
            PERFORM recalculate_product_purchase_order_aggregates(OLD.product_id, v_company_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update aggregates when sales order status changes
CREATE OR REPLACE FUNCTION trigger_update_sales_order_status_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if status changed or deleted_at changed
    IF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
        -- Recalculate for all products in this order
        PERFORM recalculate_product_sales_order_aggregates(soi.product_id, NEW.company_id)
        FROM sales_order_items soi
        WHERE soi.sales_order_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update aggregates when purchase order status changes
CREATE OR REPLACE FUNCTION trigger_update_purchase_order_status_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if status changed or deleted_at changed
    IF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
        -- Recalculate for all products in this order
        PERFORM recalculate_product_purchase_order_aggregates(poi.product_id, NEW.company_id)
        FROM purchase_order_items poi
        WHERE poi.purchase_order_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Triggers on sales_order_items table
CREATE TRIGGER trg_update_product_sales_order_aggregates
AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
FOR EACH ROW
EXECUTE FUNCTION trigger_update_product_sales_order_aggregates();

-- Triggers on purchase_order_items table
CREATE TRIGGER trg_update_product_purchase_order_aggregates
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION trigger_update_product_purchase_order_aggregates();

-- Triggers on sales_orders table for status changes
CREATE TRIGGER trg_update_sales_order_status_aggregates
AFTER UPDATE ON sales_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_update_sales_order_status_aggregates();

-- Triggers on purchase_orders table for status changes
CREATE TRIGGER trg_update_purchase_order_status_aggregates
AFTER UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_update_purchase_order_status_aggregates();


-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE product_sales_order_aggregates IS 'Aggregated sales order metrics per product at company level, segregated by order status. Includes quantity and financial metrics. Updated automatically via triggers.';
COMMENT ON TABLE product_purchase_order_aggregates IS 'Aggregated purchase order metrics per product at company level, segregated by order status. Includes quantity and financial metrics. Updated automatically via triggers.';

COMMENT ON COLUMN product_sales_order_aggregates.approval_pending_dispatched_quantity IS 'Should always be 0 - acts as bug detector if orders are dispatched before approval';
COMMENT ON COLUMN product_sales_order_aggregates.completed_pending_quantity IS 'Should always be 0 - acts as bug detector if completed orders still have pending quantities';
COMMENT ON COLUMN product_sales_order_aggregates.active_required_quantity IS 'Sum of approval_pending and in_progress required quantities - represents real demand';

COMMENT ON COLUMN product_purchase_order_aggregates.approval_pending_received_quantity IS 'Should always be 0 - acts as bug detector if orders are received before approval';
COMMENT ON COLUMN product_purchase_order_aggregates.completed_pending_quantity IS 'Should always be 0 - acts as bug detector if completed orders still have pending quantities';
COMMENT ON COLUMN product_purchase_order_aggregates.active_required_quantity IS 'Sum of approval_pending and in_progress required quantities - represents real demand';
