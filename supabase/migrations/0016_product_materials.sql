-- Product Materials Table
-- Stores material types (e.g., Cotton, Silk, Polyester) for products

CREATE TABLE product_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    name VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7), -- Badge color for UI display
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique material names per company
    UNIQUE (company_id, name)
);

-- Junction table for product-material relationships
CREATE TABLE product_material_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES product_materials(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, material_id)
);

-- Indexes for product_materials
CREATE INDEX idx_product_materials_company_id ON product_materials(company_id);
CREATE INDEX idx_product_materials_name ON product_materials(company_id, name);

-- Indexes for product_material_assignments
CREATE INDEX idx_product_material_assignments_product_id ON product_material_assignments(product_id);
CREATE INDEX idx_product_material_assignments_material_id ON product_material_assignments(material_id);

-- Enable RLS
ALTER TABLE product_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_material_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_materials
CREATE POLICY "Users can view materials in their company"
    ON product_materials FOR SELECT
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can insert materials in their company"
    ON product_materials FOR INSERT
    WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Users can update materials in their company"
    ON product_materials FOR UPDATE
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can delete materials in their company"
    ON product_materials FOR DELETE
    USING (company_id = get_jwt_company_id());

-- RLS Policies for product_material_assignments
-- Access controlled through product ownership
CREATE POLICY "Users can view material assignments for their products"
    ON product_material_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_material_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can insert material assignments for their products"
    ON product_material_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_material_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can delete material assignments for their products"
    ON product_material_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_material_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );
