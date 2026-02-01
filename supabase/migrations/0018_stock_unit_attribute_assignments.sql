-- Stock Unit Attribute Assignments (Junction Table)
-- Links stock units to their attributes (lot numbers)

CREATE TABLE stock_unit_attribute_assignments (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,

    PRIMARY KEY (stock_unit_id, attribute_id)
);

-- Indexes for stock_unit_attribute_assignments
CREATE INDEX idx_stock_unit_attribute_assignments_company_id ON stock_unit_attribute_assignments(company_id);
CREATE INDEX idx_stock_unit_attribute_assignments_stock_unit_id ON stock_unit_attribute_assignments(stock_unit_id);
CREATE INDEX idx_stock_unit_attribute_assignments_attribute_id ON stock_unit_attribute_assignments(attribute_id);

-- Enable RLS
ALTER TABLE stock_unit_attribute_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_unit_attribute_assignments
CREATE POLICY "Users can view attribute assignments in their company"
    ON stock_unit_attribute_assignments FOR SELECT
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can insert attribute assignments in their company"
    ON stock_unit_attribute_assignments FOR INSERT
    WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Users can delete attribute assignments in their company"
    ON stock_unit_attribute_assignments FOR DELETE
    USING (company_id = get_jwt_company_id());

-- Grant Permissions
GRANT SELECT, INSERT, DELETE ON stock_unit_attribute_assignments TO authenticated;
