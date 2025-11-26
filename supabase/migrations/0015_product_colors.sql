-- Product Colors Table
-- Stores color options (e.g., Red, Blue, Navy) for products

CREATE TABLE product_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    name VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7), -- The actual color value (e.g., #FF0000)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique color names per company
    UNIQUE (company_id, name)
);

-- Junction table for product-color relationships
CREATE TABLE product_color_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES product_colors(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, color_id)
);

-- Indexes for product_colors
CREATE INDEX idx_product_colors_company_id ON product_colors(company_id);
CREATE INDEX idx_product_colors_name ON product_colors(company_id, name);

-- Indexes for product_color_assignments
CREATE INDEX idx_product_color_assignments_product_id ON product_color_assignments(product_id);
CREATE INDEX idx_product_color_assignments_color_id ON product_color_assignments(color_id);

-- Enable RLS
ALTER TABLE product_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_color_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_colors
CREATE POLICY "Users can view colors in their company"
    ON product_colors FOR SELECT
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can insert colors in their company"
    ON product_colors FOR INSERT
    WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Users can update colors in their company"
    ON product_colors FOR UPDATE
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can delete colors in their company"
    ON product_colors FOR DELETE
    USING (company_id = get_jwt_company_id());

-- RLS Policies for product_color_assignments
-- Access controlled through product ownership
CREATE POLICY "Users can view color assignments for their products"
    ON product_color_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_color_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can insert color assignments for their products"
    ON product_color_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_color_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can delete color assignments for their products"
    ON product_color_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_color_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );
