'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconChevronDown, IconBuilding, IconWorld } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { validateImageFile, uploadCompanyLogo } from '@/lib/storage';
import { updateCompanyDetails } from '@/lib/queries/company';
import type { Tables } from '@/types/database/supabase';

type Company = Tables<'companies'>;

interface CompanyEditSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	company: Company;
	onSuccess: () => void;
}

interface CompanyFormData {
	name: string;
	businessType: string;
	email: string;
	phoneNumber: string;
	websiteUrl: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	state: string;
	country: string;
	pinCode: string;
	gstNumber: string;
	panNumber: string;
	image: File | null;
}

export function CompanyEditSheet({
	open,
	onOpenChange,
	company,
	onSuccess,
}: CompanyEditSheetProps) {
	const [formData, setFormData] = useState<CompanyFormData>({
		name: '',
		businessType: '',
		email: '',
		phoneNumber: '',
		websiteUrl: '',
		addressLine1: '',
		addressLine2: '',
		city: '',
		state: '',
		country: 'India',
		pinCode: '',
		gstNumber: '',
		panNumber: '',
		image: null,
	});

	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [imageError, setImageError] = useState<string | null>(null);
	const [showContact, setShowContact] = useState(true);
	const [showAddress, setShowAddress] = useState(false);
	const [showFinancial, setShowFinancial] = useState(false);
	const [saving, setSaving] = useState(false);

	// Pre-populate form data when sheet opens
	useEffect(() => {
		if (company && open) {
			setFormData({
				name: company.name || '',
				businessType: company.business_type || '',
				email: company.email || '',
				phoneNumber: company.phone_number || '',
				websiteUrl: company.website_url || '',
				addressLine1: company.address_line1 || '',
				addressLine2: company.address_line2 || '',
				city: company.city || '',
				state: company.state || '',
				country: company.country || 'India',
				pinCode: company.pin_code || '',
				gstNumber: company.gst_number || '',
				panNumber: company.pan_number || '',
				image: null,
			});
			setImagePreview(company.logo_url);
		}
	}, [company, open]);

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

		try {
			// Upload logo if a new image was selected
			let logoUrl = company.logo_url;
			if (formData.image) {
				try {
					const { publicUrl } = await uploadCompanyLogo(
						company.id,
						formData.image
					);
					logoUrl = publicUrl;
				} catch (uploadError) {
					console.error('Logo upload failed:', uploadError);
					throw new Error('Failed to upload logo. Please try again.');
				}
			}

			// Update company details
			await updateCompanyDetails(company.id, {
				name: formData.name,
				business_type: formData.businessType || null,
				email: formData.email || null,
				phone_number: formData.phoneNumber || null,
				website_url: formData.websiteUrl || null,
				address_line1: formData.addressLine1 || null,
				address_line2: formData.addressLine2 || null,
				city: formData.city || null,
				state: formData.state || null,
				country: formData.country || null,
				pin_code: formData.pinCode || null,
				gst_number: formData.gstNumber || null,
				pan_number: formData.panNumber || null,
				logo_url: logoUrl,
			});

			toast.success('Company updated successfully');
			handleCancel();
			onSuccess();
		} catch (error) {
			console.error('Error updating company:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to update company';
			toast.error(errorMessage);
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		// Reset form
		setFormData({
			name: '',
			businessType: '',
			email: '',
			phoneNumber: '',
			websiteUrl: '',
			addressLine1: '',
			addressLine2: '',
			city: '',
			state: '',
			country: 'India',
			pinCode: '',
			gstNumber: '',
			panNumber: '',
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
					<SheetTitle>Edit company</SheetTitle>
				</SheetHeader>

				{/* Form Content - Scrollable */}
				<form onSubmit={handleSubmit} className="flex flex-col h-full overflow-y-hidden">
					<div className="flex-1 overflow-y-auto">
						{/* Basic Info & Logo */}
						<div className="flex flex-col gap-5 px-4 py-5">
							{/* Logo Upload */}
							<div className="flex justify-center">
								<label
									htmlFor="company-logo"
									className="relative flex flex-col items-center justify-center size-40 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden"
								>
									{imagePreview ? (
										<Image
											src={imagePreview}
											alt="Company logo"
											fill
											className="object-cover"
										/>
									) : (
										<>
											<IconBuilding className="size-12 text-gray-400 mb-2" />
											<span className="text-sm text-gray-700">Upload logo</span>
										</>
									)}
									<input
										id="company-logo"
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

							{/* Company Name */}
							<Input
								placeholder="Company name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								required
							/>

							{/* Business Type */}
							<Input
								placeholder="Business type (e.g., Textile Manufacturing)"
								value={formData.businessType}
								onChange={(e) =>
									setFormData({ ...formData, businessType: e.target.value })
								}
							/>
						</div>

						{/* Contact Information Section */}
						<Collapsible
							open={showContact}
							onOpenChange={setShowContact}
							className="border-t border-gray-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showContact ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Contact information</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showContact ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-5">
									<Input
										type="email"
										placeholder="Email"
										value={formData.email}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
									/>
									<Input
										type="tel"
										placeholder="Phone number"
										value={formData.phoneNumber}
										onChange={(e) =>
											setFormData({ ...formData, phoneNumber: e.target.value })
										}
									/>
									<div className="relative">
										<IconWorld className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
										<Input
											type="url"
											placeholder="Website URL"
											value={formData.websiteUrl}
											onChange={(e) =>
												setFormData({ ...formData, websiteUrl: e.target.value })
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
							className="border-t border-gray-200 px-4 py-5"
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

						{/* Financial Information Section */}
						<Collapsible
							open={showFinancial}
							onOpenChange={setShowFinancial}
							className="border-t border-gray-200 px-4 py-5"
						>
							<CollapsibleTrigger className={`flex items-center justify-between w-full ${showFinancial ? 'mb-5' : 'mb-0'}`}>
								<h3 className="text-lg font-medium text-gray-900">Financial information</h3>
								<IconChevronDown
									className={`size-6 text-gray-500 transition-transform ${showFinancial ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className="flex flex-col gap-5">
									<Input
										placeholder="GST number"
										value={formData.gstNumber}
										onChange={(e) =>
											setFormData({ ...formData, gstNumber: e.target.value })
										}
									/>
									<Input
										placeholder="PAN number"
										value={formData.panNumber}
										onChange={(e) =>
											setFormData({ ...formData, panNumber: e.target.value })
										}
									/>
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>

					<SheetFooter>
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
