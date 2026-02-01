-- Product Attribute Assignments (Junction Table)
-- Links products to their attributes (materials, colors, tags)

CREATE TABLE product_attribute_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES attributes(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, attribute_id)
);

-- Indexes for product_attribute_assignments
CREATE INDEX idx_product_attribute_assignments_product_id ON product_attribute_assignments(product_id);
CREATE INDEX idx_product_attribute_assignments_attribute_id ON product_attribute_assignments(attribute_id);

-- Enable RLS
ALTER TABLE product_attribute_assignments ENABLE ROW LEVEL SECURITY;

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
