'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IconChevronDown, IconX, IconPhoto } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { validateImageFile, uploadProductImage, MAX_PRODUCT_IMAGES } from '@/lib/storage';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import type { TablesInsert } from '@/types/database/supabase';

interface AddProductSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProductAdded?: () => void;
}

interface ProductFormData {
	name: string;
	productNumber: string;
	showOnCatalog: boolean;
	material: string;
	color: string;
	gsm: string;
	threadCount: string;
	tags: string;
	measuringUnit: string;
	costPrice: string;
	sellingPrice: string;
	minStockAlert: boolean;
	minStockThreshold: string;
	hsnCode: string;
	notes: string;
	images: File[];
}

export function AddProductSheet({ open, onOpenChange, onProductAdded }: AddProductSheetProps) {
	const [formData, setFormData] = useState<ProductFormData>({
		name: '',
		productNumber: 'PROD-001',
		showOnCatalog: true,
		material: '',
		color: '',
		gsm: '',
		threadCount: '',
		tags: '',
		measuringUnit: '',
		costPrice: '',
		sellingPrice: '',
		minStockAlert: false,
		minStockThreshold: '',
		hsnCode: '',
		notes: '',
		images: [],
	});

	const [imagePreviews, setImagePreviews] = useState<string[]>([]);
	const [imageError, setImageError] = useState<string | null>(null);
	const [showFeaturesImages, setShowFeaturesImages] = useState(false);
	const [showStockDetails, setShowStockDetails] = useState(false);
	const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (!files.length) return;

		// Check if adding these files would exceed the limit
		if (formData.images.length + files.length > MAX_PRODUCT_IMAGES) {
			setImageError(`Maximum ${MAX_PRODUCT_IMAGES} images allowed`);
			return;
		}

		// Validate each file
		for (const file of files) {
			const validation = validateImageFile(file);
			if (!validation.valid) {
				setImageError(validation.error!);
				return;
			}
		}

		setImageError(null);

		// Add files to form data
		const newImages = [...formData.images, ...files];
		setFormData({ ...formData, images: newImages });

		// Create previews
		const newPreviews = [...imagePreviews];
		files.forEach((file) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				newPreviews.push(reader.result as string);
				setImagePreviews([...newPreviews]);
			};
			reader.readAsDataURL(file);
		});
	};

	const handleRemoveImage = (index: number) => {
		const newImages = formData.images.filter((_, i) => i !== index);
		const newPreviews = imagePreviews.filter((_, i) => i !== index);
		setFormData({ ...formData, images: newImages });
		setImagePreviews(newPreviews);
		setImageError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setSaveError(null);

		try {
			const supabase = createClient();

			// Get current user
			const currentUser = await getCurrentUser();
			if (!currentUser || !currentUser.company_id) {
				throw new Error('User not found');
			}

			// Parse tags (comma-separated string to array)
			const tagsArray = formData.tags
				? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
				: null;

			// Prepare typed insert data
			const productInsert: TablesInsert<'products'> = {
				company_id: currentUser.company_id,
				name: formData.name,
				product_number: formData.productNumber,
				show_on_catalog: formData.showOnCatalog,
				material: formData.material || null,
				color: formData.color || null,
				gsm: formData.gsm ? parseFloat(formData.gsm) : null,
				thread_count_cm: formData.threadCount ? parseFloat(formData.threadCount) : null,
				tags: tagsArray,
				measuring_unit: formData.measuringUnit,
				cost_price_per_unit: formData.costPrice ? parseFloat(formData.costPrice) : null,
				selling_price_per_unit: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null,
				min_stock_alert: formData.minStockAlert,
				min_stock_threshold: formData.minStockThreshold ? parseFloat(formData.minStockThreshold) : null,
				hsn_code: formData.hsnCode || null,
				notes: formData.notes || null,
				created_by: currentUser.id,
			};

			// Insert product record
			const { data: product, error: insertError } = await supabase
				.from('products')
				.insert(productInsert)
				.select()
				.single();

			if (insertError) throw insertError;

			// Upload images if provided
			if (formData.images.length > 0 && product) {
				try {
					const imageUrls: string[] = [];

					for (let i = 0; i < formData.images.length; i++) {
						const result = await uploadProductImage(
							currentUser.company_id,
							product.id,
							formData.images[i],
							i
						);
						imageUrls.push(result.publicUrl);
					}

					// Update product with image URLs
					await supabase
						.from('products')
						.update({ product_images: imageUrls })
						.eq('id', product.id);
				} catch (uploadError) {
					console.error('Image upload failed:', uploadError);
					// Don't fail the whole operation if image upload fails
				}
			}

			// Success! Close sheet and notify parent
			handleCancel();
			if (onProductAdded) {
				onProductAdded();
			}
		} catch (error) {
			console.error('Error saving product:', error);
			setSaveError(error instanceof Error ? error.message : 'Failed to save product');
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		// Reset form
		setFormData({
			name: '',
			productNumber: 'PROD-001',
			showOnCatalog: true,
			material: '',
			color: '',
			gsm: '',
			threadCount: '',
			tags: '',
			measuringUnit: '',
			costPrice: '',
			sellingPrice: '',
			minStockAlert: false,
			minStockThreshold: '',
			hsnCode: '',
			notes: '',
			images: [],
		});
		setImagePreviews([]);
		setImageError(null);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				{/* Header */}
				<SheetHeader>
					<SheetTitle>Create product</SheetTitle>
				</SheetHeader>

				{/* Form Content - Scrollable */}
				<form onSubmit={handleSubmit} className="flex flex-col h-full">
					<div className="flex-1 overflow-y-auto">
						{/* Basic Info */}
						<div className="flex flex-col gap-6 px-4 py-5">
							{/* Product Name */}
							<Input
								placeholder="Product name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								required
							/>
						</div>

						{/* Features & Images Section */}
						<Collapsible
							open={showFeaturesImages}
							onOpenChange={setShowFeaturesImages}
							className="border-t border-neutral-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showFeaturesImages ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Features & Images</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showFeaturesImages ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-6">
									{/* Material */}
									<Select
										value={formData.material}
										onValueChange={(value) =>
											setFormData({ ...formData, material: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Material" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="silk">Silk</SelectItem>
											<SelectItem value="cotton">Cotton</SelectItem>
											<SelectItem value="wool">Wool</SelectItem>
											<SelectItem value="polyester">Polyester</SelectItem>
											<SelectItem value="linen">Linen</SelectItem>
										</SelectContent>
									</Select>

									{/* Color */}
									<Select
										value={formData.color}
										onValueChange={(value) =>
											setFormData({ ...formData, color: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Color" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="red">Red</SelectItem>
											<SelectItem value="blue">Blue</SelectItem>
											<SelectItem value="green">Green</SelectItem>
											<SelectItem value="yellow">Yellow</SelectItem>
											<SelectItem value="black">Black</SelectItem>
											<SelectItem value="white">White</SelectItem>
										</SelectContent>
									</Select>

									{/* GSM & Thread Count */}
									<div className="flex gap-4">
										<Input
											type="number"
											placeholder="GSM"
											value={formData.gsm}
											onChange={(e) =>
												setFormData({ ...formData, gsm: e.target.value })
											}
											className="flex-1"
										/>
										<Input
											type="number"
											placeholder="Thread count"
											value={formData.threadCount}
											onChange={(e) =>
												setFormData({ ...formData, threadCount: e.target.value })
											}
											className="flex-1"
										/>
									</div>

									{/* Tags */}
									<Input
										placeholder="Tags (comma-separated)"
										value={formData.tags}
										onChange={(e) =>
											setFormData({ ...formData, tags: e.target.value })
										}
									/>

									{/* Image Upload */}
									<div className="flex flex-col gap-3">
										<label className="text-sm font-medium text-gray-700">
											Product Images (Max {MAX_PRODUCT_IMAGES})
										</label>

										{/* Image Previews */}
										{imagePreviews.length > 0 && (
											<div className="flex flex-wrap gap-3">
												{imagePreviews.map((preview, index) => (
													<div
														key={index}
														className="relative size-20 rounded-lg overflow-hidden border border-gray-200"
													>
														<Image
															src={preview}
															alt={`Preview ${index + 1}`}
															fill
															className="object-cover"
														/>
														<button
															type="button"
															onClick={() => handleRemoveImage(index)}
															className="absolute top-1 right-1 size-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
														>
															<IconX className="size-4" />
														</button>
													</div>
												))}
											</div>
										)}

										{/* Add Images Button */}
										{formData.images.length < MAX_PRODUCT_IMAGES && (
											<label
												htmlFor="product-images"
												className="flex items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
											>
												<IconPhoto className="size-6 text-gray-500" />
												<span className="text-sm text-gray-700">Add images</span>
												<input
													id="product-images"
													type="file"
													accept="image/jpeg,image/png,image/webp"
													onChange={handleImageSelect}
													className="sr-only"
													multiple
												/>
											</label>
										)}

										{imageError && (
											<p className="text-sm text-red-600">{imageError}</p>
										)}
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>

						{/* Stock Details Section */}
						<Collapsible
							open={showStockDetails}
							onOpenChange={setShowStockDetails}
							className="border-t border-neutral-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showStockDetails ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Stock Details</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showStockDetails ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-6">
									{/* Measuring Unit */}
									<Select
										value={formData.measuringUnit}
										onValueChange={(value) =>
											setFormData({ ...formData, measuringUnit: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Unit" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="meters">Meters</SelectItem>
											<SelectItem value="yards">Yards</SelectItem>
											<SelectItem value="pieces">Pieces</SelectItem>
											<SelectItem value="kg">Kilograms</SelectItem>
											<SelectItem value="rolls">Rolls</SelectItem>
										</SelectContent>
									</Select>

									{/* Purchase & Sale Price */}
									<div className="flex gap-4">
										<Input
											type="number"
											placeholder="Purchase price"
											value={formData.costPrice}
											onChange={(e) =>
												setFormData({ ...formData, costPrice: e.target.value })
											}
											className="flex-1"
											step="0.01"
										/>
										<Input
											type="number"
											placeholder="Sale price"
											value={formData.sellingPrice}
											onChange={(e) =>
												setFormData({ ...formData, sellingPrice: e.target.value })
											}
											className="flex-1"
											step="0.01"
										/>
									</div>

									{/* Minimum Stock Alert */}
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium text-gray-700">
											Minimum stock alert
										</label>
										<Switch
											checked={formData.minStockAlert}
											onCheckedChange={(checked) =>
												setFormData({ ...formData, minStockAlert: checked })
											}
										/>
									</div>

									{/* Minimum Stock Threshold */}
									{formData.minStockAlert && (
										<Input
											type="number"
											placeholder="Minimum stock threshold"
											value={formData.minStockThreshold}
											onChange={(e) =>
												setFormData({ ...formData, minStockThreshold: e.target.value })
											}
											step="0.01"
										/>
									)}
								</div>
							</CollapsibleContent>
						</Collapsible>

						{/* Additional Details Section */}
						<Collapsible
							open={showAdditionalDetails}
							onOpenChange={setShowAdditionalDetails}
							className="border-t border-neutral-200 px-4 py-5 pb-24"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showAdditionalDetails ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Additional Details</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showAdditionalDetails ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-6">
									{/* Show on Catalog */}
									<div className="flex items-start justify-between">
										<div className="flex flex-col">
											<label className="text-sm font-medium text-gray-700">Show on catalog</label>
											<span className="text-sm font-light text-gray-500">
												Display this product on your public sales catalog
											</span>
										</div>
										<Switch
											checked={formData.showOnCatalog}
											onCheckedChange={(checked) =>
												setFormData({ ...formData, showOnCatalog: checked })
											}
											className='mt-2'
										/>
									</div>

									{/* HSN Code */}
									<Input
										placeholder="HSN code"
										value={formData.hsnCode}
										onChange={(e) =>
											setFormData({ ...formData, hsnCode: e.target.value })
										}
									/>

									{/* Notes */}
									<Textarea
										placeholder="Enter a note..."
										value={formData.notes}
										onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
										className="min-h-32"
									/>
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>

					<SheetFooter className="flex flex-col gap-3 px-4 py-3 border-t border-neutral-200 bg-background-100 shadow-xs-reverse">
						{saveError && (
							<p className="text-sm text-red-600 text-center">{saveError}</p>
						)}
						<div className="flex gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={saving}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button type="submit" disabled={saving} className="flex-1">
								{saving ? 'Saving...' : 'Save'}
							</Button>
						</div>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
