-- Attributes Table (Generalized)
-- Consolidated table for product and partner attributes (materials, colors, tags)

CREATE TABLE attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    name VARCHAR(50) NOT NULL,
    group_name VARCHAR(20) NOT NULL,
    color_hex VARCHAR(7), -- Badge color for UI display
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique attribute names per company (across all groups)
    UNIQUE (company_id, name)
);

-- Indexes for attributes
CREATE INDEX idx_attributes_company_id ON attributes(company_id);
CREATE INDEX idx_attributes_name ON attributes(company_id, name);
CREATE INDEX idx_attributes_group_name ON attributes(company_id, group_name);

-- Enable RLS
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attributes
CREATE POLICY "Users can view attributes in their company"
    ON attributes FOR SELECT
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can insert attributes in their company"
    ON attributes FOR INSERT
    WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Users can update attributes in their company"
    ON attributes FOR UPDATE
    USING (company_id = get_jwt_company_id());

CREATE POLICY "Users can delete attributes in their company"
    ON attributes FOR DELETE
    USING (company_id = get_jwt_company_id());
