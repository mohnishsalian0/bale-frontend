'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconChevronDown, IconX, IconPhoto } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group-pills';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import MultipleSelector, { type Option } from '@/components/ui/multiple-selector';
import { validateImageFile, uploadProductImage, MAX_PRODUCT_IMAGES } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';
import { getProductAttributeLists } from '@/lib/queries/products';
import type { TablesInsert } from '@/types/database/supabase';
import type { StockType, MeasuringUnit } from '@/types/database/enums';
import { useSession } from '@/contexts/session-context';

interface AddProductSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onProductAdded?: () => void;
}

interface ProductFormData {
	name: string;
	productNumber: string;
	showOnCatalog: boolean;
	materials: Option[];
	colors: Option[];
	gsm: string;
	threadCount: string;
	tags: Option[];
	stockType: StockType | '';
	measuringUnit: MeasuringUnit | '';
	costPrice: string;
	sellingPrice: string;
	minStockAlert: boolean;
	minStockThreshold: string;
	hsnCode: string;
	notes: string;
	images: File[];
}

export function AddProductSheet({ open, onOpenChange, onProductAdded }: AddProductSheetProps) {
	const { user } = useSession();
	const [formData, setFormData] = useState<ProductFormData>({
		name: '',
		productNumber: 'PROD-001',
		showOnCatalog: true,
		materials: [],
		colors: [],
		gsm: '',
		threadCount: '',
		tags: [],
		stockType: '',
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
	const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	// Attribute options for MultipleSelector
	const [materialOptions, setMaterialOptions] = useState<Option[]>([]);
	const [colorOptions, setColorOptions] = useState<Option[]>([]);
	const [tagOptions, setTagOptions] = useState<Option[]>([]);

	// Fetch attribute lists on mount
	useEffect(() => {
		const fetchAttributes = async () => {
			const attributes = await getProductAttributeLists();
			setMaterialOptions(attributes.materials.map(m => ({ value: m.id, label: m.name })));
			setColorOptions(attributes.colors.map(c => ({ value: c.id, label: c.name })));
			setTagOptions(attributes.tags.map(t => ({ value: t.id, label: t.name })));
		};
		fetchAttributes();
	}, []);

	// Simple handlers - new items are identified by value === label
	// They will be inserted to DB on form submit
	const handleMaterialsChange = (options: Option[]) => {
		setFormData({ ...formData, materials: options });
	};

	const handleColorsChange = (options: Option[]) => {
		setFormData({ ...formData, colors: options });
	};

	const handleTagsChange = (options: Option[]) => {
		setFormData({ ...formData, tags: options });
	};

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

			// Helper to create new attributes and get their IDs
			const resolveOptions = async (
				options: Option[],
				table: 'product_materials' | 'product_colors' | 'product_tags'
			): Promise<string[]> => {
				const ids: string[] = [];
				for (const opt of options) {
					// New items have value === label
					if (opt.value === opt.label) {
						const { data, error } = await supabase
							.from(table)
							.insert({ name: opt.label })
							.select('id')
							.single();
						if (error) throw error;
						ids.push(data.id);
					} else {
						ids.push(opt.value);
					}
				}
				return ids;
			};

			// Resolve all new attributes first
			const [materialIds, colorIds, tagIds] = await Promise.all([
				resolveOptions(formData.materials, 'product_materials'),
				resolveOptions(formData.colors, 'product_colors'),
				resolveOptions(formData.tags, 'product_tags'),
			]);

			// Prepare typed insert data
			const productInsert: Omit<TablesInsert<'products'>, 'created_by' | 'modified_by' | 'sequence_number'> = {
				name: formData.name,
				show_on_catalog: formData.showOnCatalog,
				gsm: formData.gsm ? parseFloat(formData.gsm) : null,
				thread_count_cm: formData.threadCount ? parseFloat(formData.threadCount) : null,
				stock_type: formData.stockType as StockType,
				measuring_unit: formData.measuringUnit || null,
				cost_price_per_unit: formData.costPrice ? parseFloat(formData.costPrice) : null,
				selling_price_per_unit: formData.sellingPrice ? parseFloat(formData.sellingPrice) : null,
				min_stock_alert: formData.minStockAlert,
				min_stock_threshold: formData.minStockThreshold ? parseFloat(formData.minStockThreshold) : null,
				hsn_code: formData.hsnCode || null,
				notes: formData.notes || null,
			};

			// Insert product record
			const { data: product, error: insertError } = await supabase
				.from('products')
				.insert(productInsert)
				.select()
				.single();

			if (insertError) throw insertError;

			// Insert material assignments
			if (materialIds.length > 0 && product) {
				const materialAssignments = materialIds.map(id => ({
					product_id: product.id,
					material_id: id,
				}));
				const { error: materialError } = await supabase
					.from('product_material_assignments')
					.insert(materialAssignments);
				if (materialError) console.error('Error inserting materials:', materialError);
			}

			// Insert color assignments
			if (colorIds.length > 0 && product) {
				const colorAssignments = colorIds.map(id => ({
					product_id: product.id,
					color_id: id,
				}));
				const { error: colorError } = await supabase
					.from('product_color_assignments')
					.insert(colorAssignments);
				if (colorError) console.error('Error inserting colors:', colorError);
			}

			// Insert tag assignments
			if (tagIds.length > 0 && product) {
				const tagAssignments = tagIds.map(id => ({
					product_id: product.id,
					tag_id: id,
				}));
				const { error: tagError } = await supabase
					.from('product_tag_assignments')
					.insert(tagAssignments);
				if (tagError) console.error('Error inserting tags:', tagError);
			}

			// Upload images if provided
			if (formData.images.length > 0 && product) {
				try {
					const imageUrls: string[] = [];

					for (let i = 0; i < formData.images.length; i++) {
						const result = await uploadProductImage(
							user.company_id,
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
			materials: [],
			colors: [],
			gsm: '',
			threadCount: '',
			tags: [],
			stockType: '',
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
				<form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
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

							{/* Stock Type */}
							<div className="flex flex-col gap-2">
								<Label required>Stock Type</Label>
								<RadioGroup
									value={formData.stockType}
									onValueChange={(value) => {
										const stockType = value as StockType;
										let measuringUnit: MeasuringUnit | '' = '';

										// Auto-set measuring unit based on stock type
										if (stockType === 'batch') {
											measuringUnit = 'unit';
										}

										setFormData({ ...formData, stockType, measuringUnit });
									}}
									name="stock-type"
								>
									<RadioGroupItem value="roll">Roll</RadioGroupItem>
									<RadioGroupItem value="batch">Batch</RadioGroupItem>
									<RadioGroupItem value="piece">Piece</RadioGroupItem>
								</RadioGroup>
							</div>

							{/* Measuring Unit - Only show for roll type */}
							{formData.stockType === 'roll' && (
								<div className="flex flex-col gap-2">
									<Label required>Measuring Unit</Label>
									<RadioGroup
										value={formData.measuringUnit}
										onValueChange={(value) =>
											setFormData({ ...formData, measuringUnit: value as MeasuringUnit })
										}
										name="measuring-unit"
									>
										<RadioGroupItem value="metre">Metre</RadioGroupItem>
										<RadioGroupItem value="kilogram">Kilogram</RadioGroupItem>
										<RadioGroupItem value="yard">Yard</RadioGroupItem>
									</RadioGroup>
								</div>
							)}

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
								<Label>Minimum stock alert</Label>
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

						{/* Features & Images Section */}
						<Collapsible
							open={showFeaturesImages}
							onOpenChange={setShowFeaturesImages}
							className="border-t border-gray-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showFeaturesImages ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Features & Images</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showFeaturesImages ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-6">
									{/* Materials */}
									<MultipleSelector
										value={formData.materials}
										defaultOptions={materialOptions}
										onChange={handleMaterialsChange}
										placeholder="Materials"
										creatable
										triggerSearchOnFocus
										hidePlaceholderWhenSelected
										emptyIndicator={
											<p className="text-center text-sm text-gray-500">No materials found</p>
										}
									/>

									{/* Colors */}
									<MultipleSelector
										value={formData.colors}
										defaultOptions={colorOptions}
										onChange={handleColorsChange}
										placeholder="Colors"
										creatable
										triggerSearchOnFocus
										hidePlaceholderWhenSelected
										emptyIndicator={
											<p className="text-center text-sm text-gray-500">No colors found</p>
										}
									/>

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
									<MultipleSelector
										value={formData.tags}
										defaultOptions={tagOptions}
										onChange={handleTagsChange}
										placeholder="Tags"
										creatable
										triggerSearchOnFocus
										hidePlaceholderWhenSelected
										emptyIndicator={
											<p className="text-center text-sm text-gray-500">No tags found</p>
										}
									/>

									{/* Image Upload */}
									<div className="flex flex-col gap-3">
										<Label>Product Images (Max {MAX_PRODUCT_IMAGES})</Label>

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


						{/* Additional Details Section */}
						<Collapsible
							open={showAdditionalDetails}
							onOpenChange={setShowAdditionalDetails}
							className="border-t border-gray-200 px-4 py-5"
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
											<Label>Show on catalog</Label>
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

					<SheetFooter>
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
							<Button
								type="submit"
								disabled={
									saving ||
									!formData.stockType ||
									(formData.stockType === 'roll' && !formData.measuringUnit)
								}
								className="flex-1"
							>
								{saving ? 'Saving...' : 'Save'}
							</Button>
						</div>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet >
	);
}
