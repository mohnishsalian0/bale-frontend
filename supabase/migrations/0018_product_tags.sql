-- Product Tags Table
-- Stores tags for categorizing products (e.g., Premium, Sale, New Arrival)

CREATE TABLE product_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    name VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7), -- Badge color for UI display
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique tag names per company
    UNIQUE (company_id, name)
);

-- Junction table for product-tag relationships
CREATE TABLE product_tag_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,

    PRIMARY KEY (product_id, tag_id)
);

-- Indexes for product_tags
CREATE INDEX idx_product_tags_company_id ON product_tags(company_id);
CREATE INDEX idx_product_tags_name ON product_tags(company_id, name);

-- Indexes for product_tag_assignments
CREATE INDEX idx_product_tag_assignments_product_id ON product_tag_assignments(product_id);
CREATE INDEX idx_product_tag_assignments_tag_id ON product_tag_assignments(tag_id);

-- Enable RLS
ALTER TABLE product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_tags
CREATE POLICY "Users can view tags in their company"
    ON product_tags FOR SELECT
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can insert tags in their company"
    ON product_tags FOR INSERT
    WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Users can update tags in their company"
    ON product_tags FOR UPDATE
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can delete tags in their company"
    ON product_tags FOR DELETE
    USING (company_id = get_jwt_company_id());

-- RLS Policies for product_tag_assignments
-- Access controlled through product ownership
CREATE POLICY "Users can view tag assignments for their products"
    ON product_tag_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_tag_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can insert tag assignments for their products"
    ON product_tag_assignments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_tag_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

CREATE POLICY "Users can delete tag assignments for their products"
    ON product_tag_assignments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM products
            WHERE products.id = product_tag_assignments.product_id
            AND products.company_id = get_jwt_company_id()
        )
    );

-- Replace the placeholder function from 0029 with actual implementation
CREATE OR REPLACE FUNCTION get_tag_suggestions(
    search_term TEXT DEFAULT '',
    company_id_param UUID DEFAULT NULL
)
RETURNS TABLE(tag TEXT, usage_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        pt.name as tag,
        COUNT(pta.product_id) as usage_count
    FROM product_tags pt
    LEFT JOIN product_tag_assignments pta ON pt.id = pta.tag_id
    WHERE pt.company_id = COALESCE(company_id_param, get_jwt_company_id())
        AND (search_term = '' OR pt.name ILIKE search_term || '%')
    GROUP BY pt.id, pt.name
    ORDER BY usage_count DESC, tag ASC
    LIMIT 10;
$$;
