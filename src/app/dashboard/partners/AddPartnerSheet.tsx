'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IconUser, IconPhone, IconChevronDown, IconBuildingFactory2, IconBuilding, IconId } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group-pills';
import { Sheet, SheetContent, SheetFooter, SheetHeader } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { validateImageFile, uploadPartnerImage } from '@/lib/storage';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import type { TablesInsert } from '@/types/database/supabase';
import type { PartnerType } from '@/types/database/enums';

interface AddPartnerSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onPartnerAdded?: () => void;
}

interface PartnerFormData {
	partnerType: PartnerType;
	firstName: string;
	lastName: string;
	phoneNumber: string;
	businessType: string;
	companyName: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	state: string;
	country: string;
	pinCode: string;
	gstNumber: string;
	panNumber: string;
	notes: string;
	image: File | null;
}

export function AddPartnerSheet({ open, onOpenChange, onPartnerAdded }: AddPartnerSheetProps) {
	const [formData, setFormData] = useState<PartnerFormData>({
		partnerType: 'customer',
		firstName: '',
		lastName: '',
		phoneNumber: '',
		businessType: '',
		companyName: '',
		addressLine1: '',
		addressLine2: '',
		city: '',
		state: '',
		country: 'India',
		pinCode: '',
		gstNumber: '',
		panNumber: '',
		notes: '',
		image: null,
	});

	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [imageError, setImageError] = useState<string | null>(null);
	const [showBusinessDetails, setShowBusinessDetails] = useState(false);
	const [showAddress, setShowAddress] = useState(false);
	const [showTaxDetails, setShowTaxDetails] = useState(false);
	const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const validation = validateImageFile(file);
		if (!validation.valid) {
			setImageError(validation.error!);
			return;
		}

		setImageError(null);
		setFormData({ ...formData, image: file });

		// Create preview
		const reader = new FileReader();
		reader.onloadend = () => {
			setImagePreview(reader.result as string);
		};
		reader.readAsDataURL(file);
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

			// Prepare typed insert data
			const partnerInsert: TablesInsert<'partners'> = {
				company_id: currentUser.company_id,
				partner_type: formData.partnerType,
				first_name: formData.firstName,
				last_name: formData.lastName,
				phone_number: formData.phoneNumber,
				email: null,
				company_name: formData.companyName || null,
				address_line1: formData.addressLine1 || null,
				address_line2: formData.addressLine2 || null,
				city: formData.city || null,
				state: formData.state || null,
				country: formData.country || null,
				pin_code: formData.pinCode || null,
				gst_number: formData.gstNumber || null,
				pan_number: formData.panNumber || null,
				notes: formData.notes || null,
				created_by: currentUser.id,
			};

			// Insert partner record
			const { data: partner, error: insertError } = await supabase
				.from('partners')
				.insert(partnerInsert)
				.select()
				.single();

			if (insertError) throw insertError;

			// Upload image if provided
			if (formData.image && partner) {
				try {
					await uploadPartnerImage(currentUser.company_id, partner.id, formData.image);
				} catch (uploadError) {
					console.error('Image upload failed:', uploadError);
					// Don't fail the whole operation if image upload fails
				}
			}

			// Success! Close sheet and notify parent
			handleCancel();
			if (onPartnerAdded) {
				onPartnerAdded();
			}
		} catch (error) {
			console.error('Error saving partner:', error);
			setSaveError(error instanceof Error ? error.message : 'Failed to save partner');
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		// Reset form
		setFormData({
			partnerType: 'customer',
			firstName: '',
			lastName: '',
			phoneNumber: '',
			businessType: '',
			companyName: '',
			addressLine1: '',
			addressLine2: '',
			city: '',
			state: '',
			country: 'India',
			pinCode: '',
			gstNumber: '',
			panNumber: '',
			notes: '',
			image: null,
		});
		setImagePreview(null);
		setImageError(null);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				{/* Header */}
				<SheetHeader>
					<h2 className="text-2xl font-bold text-gray-900">Add partner</h2>
				</SheetHeader>

				{/* Form Content - Scrollable */}
				<form onSubmit={handleSubmit} className="flex flex-col h-full">
					<div className="flex-1 overflow-y-auto">
						{/* Image Upload & Basic Info */}
						<div className="flex flex-col gap-5 px-4 py-5">
							{/* Image Upload */}
							<div className="flex justify-center">
								<label
									htmlFor="partner-image"
									className="relative flex flex-col items-center justify-center size-40 rounded-full border-shadow-gray bg-neutral-100 cursor-pointer hover:bg-neutral-200 transition-colors"
								>
									{imagePreview ? (
										<Image
											src={imagePreview}
											alt="Partner preview"
											fill
											className="object-cover rounded-full"
										/>
									) : (
										<>
											<IconUser className="size-12 text-gray-700 mb-2" />
											<span className="text-base text-gray-700">Add image</span>
										</>
									)}
									<input
										id="partner-image"
										type="file"
										accept="image/jpeg,image/png,image/webp"
										onChange={handleImageSelect}
										className="sr-only"
									/>
								</label>
							</div>
							{imageError && (
								<p className="text-sm text-red-600 text-center">{imageError}</p>
							)}

							{/* Partner Type */}
							<div className="flex flex-col gap-2">
								<label className="text-sm font-medium text-gray-700">Partner type</label>
								<RadioGroup
									value={formData.partnerType}
									onValueChange={(value) =>
										setFormData({ ...formData, partnerType: value as PartnerType })
									}
									name="partner-type"
								>
									<RadioGroupItem value="customer">Customer</RadioGroupItem>
									<RadioGroupItem value="supplier">Supplier</RadioGroupItem>
									<RadioGroupItem value="vendor">Vendor</RadioGroupItem>
									<RadioGroupItem value="agent">Agent</RadioGroupItem>
								</RadioGroup>
							</div>

							{/* Name Fields */}
							<div className="flex gap-4">
								<Input
									placeholder="First name"
									value={formData.firstName}
									onChange={(e) =>
										setFormData({ ...formData, firstName: e.target.value })
									}
									required
								/>
								<Input
									placeholder="Last name"
									value={formData.lastName}
									onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
									required
								/>
							</div>

							{/* Phone Number */}
							<div className="relative">
								<IconPhone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
								<Input
									type="tel"
									placeholder="Phone number"
									value={formData.phoneNumber}
									onChange={(e) =>
										setFormData({ ...formData, phoneNumber: e.target.value })
									}
									className="pl-12"
								/>
							</div>
						</div>

						{/* Business Details Section */}
						<Collapsible
							open={showBusinessDetails}
							onOpenChange={setShowBusinessDetails}
							className="border-t border-neutral-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showBusinessDetails ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Business details</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showBusinessDetails ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-5">
									<div className="relative">
										<IconBuildingFactory2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
										<Input
											placeholder="Business type"
											value={formData.businessType}
											onChange={(e) =>
												setFormData({ ...formData, businessType: e.target.value })
											}
											className="pl-12"
										/>
									</div>
									<div className="relative">
										<IconBuilding className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
										<Input
											placeholder="Company name"
											value={formData.companyName}
											onChange={(e) =>
												setFormData({ ...formData, companyName: e.target.value })
											}
											className="pl-12"
										/>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>

						{/* Address Section */}
						<Collapsible
							open={showAddress}
							onOpenChange={setShowAddress}
							className="border-t border-neutral-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showAddress ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Address</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showAddress ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-5">
									<Input
										placeholder="Address line 1"
										value={formData.addressLine1}
										onChange={(e) =>
											setFormData({ ...formData, addressLine1: e.target.value })
										}
									/>
									<Input
										placeholder="Address line 2"
										value={formData.addressLine2}
										onChange={(e) =>
											setFormData({ ...formData, addressLine2: e.target.value })
										}
									/>
									<div className="flex gap-4">
										<Input
											placeholder="City"
											value={formData.city}
											onChange={(e) => setFormData({ ...formData, city: e.target.value })}
										/>
										<Input
											placeholder="State"
											value={formData.state}
											onChange={(e) => setFormData({ ...formData, state: e.target.value })}
										/>
									</div>
									<div className="flex gap-4">
										<Input
											placeholder="Country"
											value={formData.country}
											onChange={(e) =>
												setFormData({ ...formData, country: e.target.value })
											}
										/>
										<Input
											placeholder="Pin code"
											value={formData.pinCode}
											onChange={(e) =>
												setFormData({ ...formData, pinCode: e.target.value })
											}
										/>
									</div>
								</div>
							</CollapsibleContent>
						</Collapsible>

						{/* Tax Details Section */}
						<Collapsible
							open={showTaxDetails}
							onOpenChange={setShowTaxDetails}
							className="border-t border-neutral-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showTaxDetails ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Tax Details</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showTaxDetails ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-5">
									<div className="relative">
										<IconId className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
										<Input
											placeholder="GST number"
											value={formData.gstNumber}
											onChange={(e) =>
												setFormData({ ...formData, gstNumber: e.target.value })
											}
											className="pl-12"
										/>
									</div>
									<div className="relative">
										<IconId className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
										<Input
											placeholder="PAN number"
											value={formData.panNumber}
											onChange={(e) =>
												setFormData({ ...formData, panNumber: e.target.value })
											}
											className="pl-12"
										/>
									</div>
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
								<Textarea
									placeholder="Enter a note..."
									value={formData.notes}
									onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
									className="min-h-32"
								/>
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
