-- Product Attribute Assignments (Junction Table)
-- Links products to their attributes (materials, colors, tags)

CREATE TABLE product_attribute_assignments (
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, attribute_id)
);

-- Indexes for product_attribute_assignments
CREATE INDEX idx_product_attribute_assignments_company_id ON product_attribute_assignments(company_id);
CREATE INDEX idx_product_attribute_assignments_product_id ON product_attribute_assignments(product_id);
CREATE INDEX idx_product_attribute_assignments_attribute_id ON product_attribute_assignments(attribute_id);

-- Enable RLS
ALTER TABLE product_attribute_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_attribute_assignments
CREATE POLICY "Users can view attribute assignments in their company"
    ON product_attribute_assignments FOR SELECT
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can insert attribute assignments in their company"
    ON product_attribute_assignments FOR INSERT
    WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Users can delete attribute assignments in their company"
    ON product_attribute_assignments FOR DELETE
    USING (company_id = get_jwt_company_id());
