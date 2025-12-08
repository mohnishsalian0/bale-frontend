-- Product Attributes Table
-- Consolidated table for materials, colors, and tags

CREATE TABLE product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    name VARCHAR(50) NOT NULL,
    group_name VARCHAR(20) NOT NULL, -- 'material', 'color', or 'tag'
    color_hex VARCHAR(7), -- Badge color for UI display
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique attribute names per company (across all groups)
    UNIQUE (company_id, name)
);

-- Junction table for product-attribute relationships
CREATE TABLE product_attribute_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, attribute_id)
);

-- Indexes for product_attributes
CREATE INDEX idx_product_attributes_company_id ON product_attributes(company_id);
CREATE INDEX idx_product_attributes_name ON product_attributes(company_id, name);
CREATE INDEX idx_product_attributes_group_name ON product_attributes(company_id, group_name);

-- Indexes for product_attribute_assignments
CREATE INDEX idx_product_attribute_assignments_product_id ON product_attribute_assignments(product_id);
CREATE INDEX idx_product_attribute_assignments_attribute_id ON product_attribute_assignments(attribute_id);

-- Enable RLS
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_attributes
CREATE POLICY "Users can view attributes in their company"
    ON product_attributes FOR SELECT
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can insert attributes in their company"
    ON product_attributes FOR INSERT
    WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Users can update attributes in their company"
    ON product_attributes FOR UPDATE
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can delete attributes in their company"
    ON product_attributes FOR DELETE
    USING (company_id = get_jwt_company_id());

-- RLS Policies for product_attribute_assignments
-- Access controlled through product ownership
CREATE POLICY "Users can view attribute assignments for their products"
    ON product_attribute_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_attribute_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can insert attribute assignments for their products"
    ON product_attribute_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_attribute_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can delete attribute assignments for their products"
    ON product_attribute_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_attribute_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );
