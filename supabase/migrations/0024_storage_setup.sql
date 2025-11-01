-- Bale Backend - Storage Buckets Setup
-- Create storage buckets and configure access policies

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

-- Company logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'company-logos',
    'company-logos',
    true, -- Public read access
    2097152, -- 2MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Profile images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images',
    true, -- Public read access
    2097152, -- 2MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true, -- Public read access for catalog
    2097152, -- 2MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Partner images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'partner-images',
    'partner-images',
    true, -- Public read access
    2097152, -- 2MB in bytes
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES - COMPANY LOGOS
-- =====================================================

-- Anyone can view company logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Admins can upload company logos
-- Path format: {company_id}/logo.{ext}
CREATE POLICY "Admins can upload their company logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
);

-- Admins can update their company logo
CREATE POLICY "Admins can update their company logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
)
WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
);

-- Admins can delete their company logo
CREATE POLICY "Admins can delete their company logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
);

-- =====================================================
-- STORAGE POLICIES - PROFILE IMAGES
-- =====================================================

-- Anyone can view profile images (public bucket)
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Users can upload their own profile image
-- Path format: {user_id}/profile.{ext}
CREATE POLICY "Users can upload their own profile image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = (
        SELECT id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
);

-- Users can update their own profile image
CREATE POLICY "Users can update their own profile image"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = (
        SELECT id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
)
WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = (
        SELECT id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
);

-- Users can delete their own profile image
CREATE POLICY "Users can delete their own profile image"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = (
        SELECT id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
);

-- =====================================================
-- STORAGE POLICIES - PRODUCT IMAGES
-- =====================================================

-- Anyone can view product images (for public catalog)
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Authenticated users can upload product images for their company
-- Path format: {company_id}/{product_id}/{image_number}.{ext}
CREATE POLICY "Company users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
);

-- Company users can update their product images
CREATE POLICY "Company users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
)
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
);

-- Company users can delete their product images
CREATE POLICY "Company users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1
    )
);

-- =====================================================
-- STORAGE POLICIES - PARTNER IMAGES
-- =====================================================

-- Anyone can view partner images
CREATE POLICY "Anyone can view partner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-images');

-- Company admins can upload partner images
-- Path format: {company_id}/{partner_id}/image.{ext}
CREATE POLICY "Company admins can upload partner images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'partner-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
);

-- Company admins can update partner images
CREATE POLICY "Company admins can update partner images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'partner-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
)
WITH CHECK (
    bucket_id = 'partner-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
);

-- Company admins can delete partner images
CREATE POLICY "Company admins can delete partner images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'partner-images'
    AND (storage.foldername(name))[1] = (
        SELECT company_id::text
        FROM users
        WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        LIMIT 1
    )
);
