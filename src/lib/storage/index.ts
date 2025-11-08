/**
 * Storage Utility Functions
 * Handles file uploads, deletions, and URL generation for Supabase Storage
 */

import { createClient } from '@/lib/supabase/client';

// Bucket names
export const STORAGE_BUCKETS = {
	COMPANY_LOGOS: 'company-logos',
	PROFILE_IMAGES: 'profile-images',
	PRODUCT_IMAGES: 'product-images',
	PARTNER_IMAGES: 'partner-images',
	WAREHOUSE_IMAGES: 'warehouse-images',
} as const;

// File validation constants
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PRODUCT_IMAGES = 5;

// Error types
export class StorageError extends Error {
	constructor(
		message: string,
		public code?: string
	) {
		super(message);
		this.name = 'StorageError';
	}
}

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
		};
	}

	// Check file type
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		return {
			valid: false,
			error: `File type must be JPEG, PNG, or WebP`,
		};
	}

	return { valid: true };
}

/**
 * Upload a company logo
 * Path format: {company_id}/logo.{ext}
 */
export async function uploadCompanyLogo(
	companyId: string,
	file: File
): Promise<{ publicUrl: string; path: string }> {
	const validation = validateImageFile(file);
	if (!validation.valid) {
		throw new StorageError(validation.error!);
	}

	const supabase = createClient();
	const fileExt = file.name.split('.').pop();
	const filePath = `${companyId}/logo.${fileExt}`;

	// Delete existing logo if any
	await supabase.storage.from(STORAGE_BUCKETS.COMPANY_LOGOS).remove([filePath]);

	// Upload new logo
	const { data, error } = await supabase.storage
		.from(STORAGE_BUCKETS.COMPANY_LOGOS)
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: true,
		});

	if (error) {
		throw new StorageError(error.message, error.name);
	}

	const { data: urlData } = supabase.storage
		.from(STORAGE_BUCKETS.COMPANY_LOGOS)
		.getPublicUrl(data.path);

	return {
		publicUrl: urlData.publicUrl,
		path: data.path,
	};
}

/**
 * Upload a user profile image
 * Path format: {user_id}/profile.{ext}
 */
export async function uploadProfileImage(
	userId: string,
	file: File
): Promise<{ publicUrl: string; path: string }> {
	const validation = validateImageFile(file);
	if (!validation.valid) {
		throw new StorageError(validation.error!);
	}

	const supabase = createClient();
	const fileExt = file.name.split('.').pop();
	const filePath = `${userId}/profile.${fileExt}`;

	// Delete existing profile image if any
	await supabase.storage.from(STORAGE_BUCKETS.PROFILE_IMAGES).remove([filePath]);

	// Upload new profile image
	const { data, error } = await supabase.storage
		.from(STORAGE_BUCKETS.PROFILE_IMAGES)
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: true,
		});

	if (error) {
		throw new StorageError(error.message, error.name);
	}

	const { data: urlData } = supabase.storage
		.from(STORAGE_BUCKETS.PROFILE_IMAGES)
		.getPublicUrl(data.path);

	return {
		publicUrl: urlData.publicUrl,
		path: data.path,
	};
}

/**
 * Upload a partner image
 * Path format: {company_id}/{partner_id}/image.{ext}
 */
export async function uploadPartnerImage(
	companyId: string,
	partnerId: string,
	file: File
): Promise<{ publicUrl: string; path: string }> {
	const validation = validateImageFile(file);
	if (!validation.valid) {
		throw new StorageError(validation.error!);
	}

	const supabase = createClient();
	const fileExt = file.name.split('.').pop();
	const filePath = `${companyId}/${partnerId}/image.${fileExt}`;

	// Delete existing partner image if any
	await supabase.storage.from(STORAGE_BUCKETS.PARTNER_IMAGES).remove([filePath]);

	// Upload partner image
	const { data, error } = await supabase.storage
		.from(STORAGE_BUCKETS.PARTNER_IMAGES)
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: true,
		});

	if (error) {
		throw new StorageError(error.message, error.name);
	}

	const { data: urlData } = supabase.storage
		.from(STORAGE_BUCKETS.PARTNER_IMAGES)
		.getPublicUrl(data.path);

	return {
		publicUrl: urlData.publicUrl,
		path: data.path,
	};
}

/**
 * Upload a warehouse image
 * Path format: {company_id}/{warehouse_id}/image.{ext}
 */
export async function uploadWarehouseImage(
	companyId: string,
	warehouseId: string,
	file: File
): Promise<{ publicUrl: string; path: string }> {
	const validation = validateImageFile(file);
	if (!validation.valid) {
		throw new StorageError(validation.error!);
	}

	const supabase = createClient();
	const fileExt = file.name.split('.').pop();
	const filePath = `${companyId}/${warehouseId}/image.${fileExt}`;

	// Delete existing warehouse image if any
	await supabase.storage.from(STORAGE_BUCKETS.WAREHOUSE_IMAGES).remove([filePath]);

	// Upload warehouse image
	const { data, error } = await supabase.storage
		.from(STORAGE_BUCKETS.WAREHOUSE_IMAGES)
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: true,
		});

	if (error) {
		throw new StorageError(error.message, error.name);
	}

	const { data: urlData } = supabase.storage
		.from(STORAGE_BUCKETS.WAREHOUSE_IMAGES)
		.getPublicUrl(data.path);

	return {
		publicUrl: urlData.publicUrl,
		path: data.path,
	};
}

/**
 * Upload a product image
 * Path format: {company_id}/{product_id}/{index}.{ext}
 */
export async function uploadProductImage(
	companyId: string,
	productId: string,
	file: File,
	index: number
): Promise<{ publicUrl: string; path: string }> {
	const validation = validateImageFile(file);
	if (!validation.valid) {
		throw new StorageError(validation.error!);
	}

	if (index < 0 || index >= MAX_PRODUCT_IMAGES) {
		throw new StorageError(`Image index must be between 0 and ${MAX_PRODUCT_IMAGES - 1}`);
	}

	const supabase = createClient();
	const fileExt = file.name.split('.').pop();
	const filePath = `${companyId}/${productId}/${index}.${fileExt}`;

	// Upload product image
	const { data, error } = await supabase.storage
		.from(STORAGE_BUCKETS.PRODUCT_IMAGES)
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: true,
		});

	if (error) {
		throw new StorageError(error.message, error.name);
	}

	const { data: urlData } = supabase.storage
		.from(STORAGE_BUCKETS.PRODUCT_IMAGES)
		.getPublicUrl(data.path);

	return {
		publicUrl: urlData.publicUrl,
		path: data.path,
	};
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
	const supabase = createClient();

	const { error } = await supabase.storage.from(bucket).remove([path]);

	if (error) {
		throw new StorageError(error.message, error.name);
	}
}

/**
 * Delete a warehouse image
 */
export async function deleteWarehouseImage(
	companyId: string,
	warehouseId: string
): Promise<void> {
	const supabase = createClient();
	const folderPath = `${companyId}/${warehouseId}`;

	// List all files in the warehouse folder
	const { data: files, error: listError } = await supabase.storage
		.from(STORAGE_BUCKETS.WAREHOUSE_IMAGES)
		.list(folderPath);

	if (listError) {
		throw new StorageError(listError.message, listError.name);
	}

	if (!files || files.length === 0) {
		return; // No files to delete
	}

	// Delete all files
	const filePaths = files.map((file) => `${folderPath}/${file.name}`);
	const { error: deleteError } = await supabase.storage
		.from(STORAGE_BUCKETS.WAREHOUSE_IMAGES)
		.remove(filePaths);

	if (deleteError) {
		throw new StorageError(deleteError.message, deleteError.name);
	}
}

/**
 * Delete all product images for a product
 */
export async function deleteProductImages(
	companyId: string,
	productId: string
): Promise<void> {
	const supabase = createClient();
	const folderPath = `${companyId}/${productId}`;

	// List all files in the product folder
	const { data: files, error: listError } = await supabase.storage
		.from(STORAGE_BUCKETS.PRODUCT_IMAGES)
		.list(folderPath);

	if (listError) {
		throw new StorageError(listError.message, listError.name);
	}

	if (!files || files.length === 0) {
		return; // No files to delete
	}

	// Delete all files
	const filePaths = files.map((file) => `${folderPath}/${file.name}`);
	const { error: deleteError } = await supabase.storage
		.from(STORAGE_BUCKETS.PRODUCT_IMAGES)
		.remove(filePaths);

	if (deleteError) {
		throw new StorageError(deleteError.message, deleteError.name);
	}
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, path: string): string {
	const supabase = createClient();

	const { data } = supabase.storage.from(bucket).getPublicUrl(path);

	return data.publicUrl;
}

/**
 * Get product image URLs
 */
export async function getProductImageUrls(
	companyId: string,
	productId: string
): Promise<string[]> {
	const supabase = createClient();
	const folderPath = `${companyId}/${productId}`;

	// List all files in the product folder
	const { data: files, error } = await supabase.storage
		.from(STORAGE_BUCKETS.PRODUCT_IMAGES)
		.list(folderPath);

	if (error) {
		throw new StorageError(error.message, error.name);
	}

	if (!files || files.length === 0) {
		return [];
	}

	// Sort by filename (which is the index) and get public URLs
	return files
		.sort((a, b) => {
			const aIndex = parseInt(a.name.split('.')[0]);
			const bIndex = parseInt(b.name.split('.')[0]);
			return aIndex - bIndex;
		})
		.map((file) => getPublicUrl(STORAGE_BUCKETS.PRODUCT_IMAGES, `${folderPath}/${file.name}`));
}
