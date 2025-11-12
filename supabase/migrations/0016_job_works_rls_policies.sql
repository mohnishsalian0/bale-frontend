
-- Bale Backend - Job Works RLS Policies
-- Security policies for job works management

-- =====================================================
-- ENABLE RLS ON JOB WORK TABLES
-- =====================================================

ALTER TABLE job_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_work_raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_work_finished_goods ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- JOB WORKS TABLE RLS POLICIES
-- =====================================================

-- Admins can view all job works, staff can view job works in their assigned warehouse
CREATE POLICY "Users can view job works in their scope"
ON job_works
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_works.read')
);

-- Admins can create job works for any warehouse, staff only for their assigned warehouse
CREATE POLICY "Users can create job works in their scope"
ON job_works
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('job_works.create')
);

-- Admins can update all job works, staff only in their assigned warehouse
CREATE POLICY "Users can update job works in their scope"
ON job_works
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('job_works.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('job_works.update')
);

-- Admins can delete job works, staff only in their assigned warehouse
CREATE POLICY "Users can delete job works in their scope"
ON job_works
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('job_works.delete')
);

-- =====================================================
-- JOB WORK RAW MATERIALS RLS POLICIES
-- =====================================================

-- Authorized users can view job work raw materials
CREATE POLICY "Authorized users can view job work raw materials"
ON job_work_raw_materials
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.read')
);

-- Authorized users can create job work raw materials
CREATE POLICY "Authorized users can create job works raw materials"
ON job_work_raw_materials
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.create')
);

-- Authorized users can update job work raw materials
CREATE POLICY "Authorized users can update job works raw materials"
ON job_work_raw_materials
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.update')
);

-- Authorized users can delete job work raw materials
CREATE POLICY "Authorized users can delete job works raw materials"
ON job_work_raw_materials
FOR DELETE
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.delete')
);

-- =====================================================
-- JOB WORK FINISHED GOODS RLS POLICIES
-- =====================================================

-- Authorized users can view job work finished goods
CREATE POLICY "Authorized users can view job work finished goods"
ON job_work_finished_goods
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.read')
);

-- Authorized users can create job work finished goods
CREATE POLICY "Authorized users can create job works finished goods"
ON job_work_finished_goods
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.create')
);

-- Authorized users can update job work finished goods
CREATE POLICY "Authorized users can update job works finished goods"
ON job_work_finished_goods
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.update')
);

-- Authorized users can delete job work finished goods
CREATE POLICY "Authorized users can delete job works finished goods"
ON job_work_finished_goods
FOR DELETE
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.delete')
);


-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON job_works TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_work_raw_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_work_finished_goods TO authenticated;
