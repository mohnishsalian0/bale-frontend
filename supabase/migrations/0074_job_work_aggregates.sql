-- Bale Backend - Job Work Aggregate Functions
-- Server-side aggregation for job work stats

CREATE OR REPLACE FUNCTION get_job_work_aggregates(
    p_warehouse_id UUID
)
RETURNS TABLE (
    order_count BIGINT,
    pending_quantities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Count of active job works
        (SELECT COUNT(*)::BIGINT
         FROM job_works
         WHERE warehouse_id = p_warehouse_id
           AND status IN ('approval_pending', 'in_progress')
           AND deleted_at IS NULL
        ) AS order_count,

        -- Aggregate pending quantities by measuring unit
        -- Returns JSONB array: [{"unit": "metre", "quantity": 100}, {"unit": "unit", "quantity": 50}]
        COALESCE(
            (SELECT jsonb_agg(unit_totals)
             FROM (
                 SELECT jsonb_build_object(
                     'unit', p.measuring_unit,
                     'quantity', SUM(jwi.pending_quantity)
                 ) AS unit_totals
                 FROM job_works jw
                 INNER JOIN job_work_items jwi ON jw.id = jwi.job_work_id
                 INNER JOIN products p ON jwi.product_id = p.id
                 WHERE jw.warehouse_id = p_warehouse_id
                   AND jw.status IN ('approval_pending', 'in_progress')
                   AND jw.deleted_at IS NULL
                 GROUP BY p.measuring_unit
                 HAVING SUM(jwi.pending_quantity) > 0
             ) AS subquery
            ),
            '[]'::jsonb
        ) AS pending_quantities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_job_work_aggregates(UUID) TO authenticated;
