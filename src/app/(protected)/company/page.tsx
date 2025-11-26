'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
	IconPhone,
	IconMail,
	IconWorld,
	IconMapPin,
	IconReceipt,
	IconPencil,
	IconBuilding,
	IconPlus,
	IconBuildingWarehouse,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Section } from '@/components/layouts/section';
import ImageWrapper from '@/components/ui/image-wrapper';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import { AddWarehouseSheet } from '@/app/(protected)/warehouse/AddWarehouseSheet';
import { CompanyEditSheet } from '@/app/(protected)/company/CompanyEditSheet';
import { getCompanyDetails, getCompanyWarehouses } from '@/lib/queries/company';
import { formatWebsiteUrl, getFormattedCompanyAddress } from '@/lib/utils/company';
import type { Tables } from '@/types/database/supabase';

type Company = Tables<'companies'>;
type Warehouse = Tables<'warehouses'>;

export default function CompanyPage() {
	const router = useRouter();
	const [company, setCompany] = useState<Company | null>(null);
	const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showEditSheet, setShowEditSheet] = useState(false);
	const [showAddWarehouseSheet, setShowAddWarehouseSheet] = useState(false);

	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

			const [companyData, warehousesData] = await Promise.all([
				getCompanyDetails(),
				getCompanyWarehouses(),
			]);

			setCompany(companyData);
			setWarehouses(warehousesData);
		} catch (err) {
			console.error('Error fetching company data:', err);
			setError(err instanceof Error ? err.message : 'Failed to load company data');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	if (loading) {
		return <LoadingState message="Loading company details..." />;
	}

	if (error || !company) {
		return (
			<ErrorState
				title="Failed to load company"
				message={error || 'Company not found'}
				onRetry={fetchData}
			/>
		);
	}

	const addressLines = getFormattedCompanyAddress(company);
	const hasContactInfo = company.phone_number || company.email || company.website_url;

	return (
		<div className="flex flex-col h-full overflow-y-auto">
			{/* Header Section */}
			<div className="relative px-4 pt-6 pb-4 border-b border-gray-200">
				<div className="flex items-start gap-4">
					{/* Logo */}
					<ImageWrapper
						size="lg"
						shape="square"
						imageUrl={company.logo_url || undefined}
						alt={company.name}
						placeholderIcon={IconBuilding}
					/>

					{/* Info Column */}
					<div className="flex-1 min-w-0">
						{/* Company Name */}
						<h1 className="text-2xl font-bold text-gray-900">
							{company.name}
						</h1>

						{/* Business Type */}
						{company.business_type && (
							<p className="text-sm text-gray-500 mt-1">
								{company.business_type}
							</p>
						)}

						{/* Contact Info Row */}
						{hasContactInfo && (
							<div className="flex items-center flex-wrap gap-2 mt-2 text-sm text-gray-700">
								{company.phone_number && (
									<>
										<IconPhone className="size-4 shrink-0" />
										<span>{company.phone_number}</span>
									</>
								)}

								{company.phone_number && (company.email || company.website_url) && (
									<span className="text-gray-400">•</span>
								)}

								{company.email && (
									<>
										<IconMail className="size-4 shrink-0" />
										<span className="truncate">{company.email}</span>
									</>
								)}

								{company.email && company.website_url && (
									<span className="text-gray-400">•</span>
								)}

								{company.website_url && (
									<>
										<IconWorld className="size-4 shrink-0" />
										<a
											href={company.website_url.startsWith('http') ? company.website_url : `https://${company.website_url}`}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:underline truncate"
										>
											{formatWebsiteUrl(company.website_url)}
										</a>
									</>
								)}
							</div>
						)}
					</div>

					{/* Edit Button */}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setShowEditSheet(true)}
						className="shrink-0"
					>
						<IconPencil className="size-5" />
					</Button>
				</div>
			</div>

			{/* Scrollable Content */}
			<div className="flex-1 overflow-y-auto">
				<div className="flex flex-col gap-3 p-4">
					{/* Address Section */}
					{addressLines.length > 0 && (
						<Section
							title="Address"
							subtitle="Company registered address"
							icon={() => <IconMapPin className="size-5" />}
						>
							<div className="space-y-1">
								{addressLines.map((line, index) => (
									<p key={index} className="text-sm text-gray-700">
										{line}
									</p>
								))}
							</div>
						</Section>
					)}

					{/* Financial Information Section */}
					{(company.gst_number || company.pan_number) && (
						<Section
							title="Financial information"
							subtitle="Tax and business registration details"
							icon={() => <IconReceipt className="size-5" />}
						>
							<div className="space-y-3">
								{company.gst_number && (
									<div className="flex justify-between text-sm">
										<span className="text-gray-700">GST number</span>
										<span className="font-semibold text-gray-700">
											{company.gst_number}
										</span>
									</div>
								)}

								{company.pan_number && (
									<div className="flex justify-between text-sm">
										<span className="text-gray-700">PAN</span>
										<span className="font-semibold text-gray-700">
											{company.pan_number}
										</span>
									</div>
								)}
							</div>
						</Section>
					)}

					{/* Warehouses Section */}
					<div className="flex flex-col gap-3">
						{/* Header */}
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-bold text-gray-900">Warehouses</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowAddWarehouseSheet(true)}
							>
								<IconPlus className="size-4 mr-1" />
								New warehouse
							</Button>
						</div>

						{/* Warehouse Cards */}
						{warehouses.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<p className="text-gray-600 mb-2">No warehouses found</p>
								<p className="text-sm text-gray-500">
									Create your first warehouse to get started
								</p>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-3">
								{warehouses.map((warehouse) => (
									<Card
										key={warehouse.id}
										className="cursor-pointer hover:bg-gray-50 transition-colors"
										onClick={() => router.push(`/warehouse/${warehouse.slug}/dashboard`)}
									>
										<CardContent className="p-3">
											<div className="flex items-center gap-3">
												<ImageWrapper
													size="md"
													shape="square"
													imageUrl={undefined}
													alt={warehouse.name}
													placeholderIcon={IconBuildingWarehouse}
												/>
												<div className="flex-1 min-w-0">
													<p className="font-medium text-gray-900 truncate" title={warehouse.name}>
														{warehouse.name}
													</p>
													<p className="text-xs text-gray-500 truncate">
														{warehouse.city || 'No location'}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Add Warehouse Sheet */}
			<AddWarehouseSheet
				open={showAddWarehouseSheet}
				onOpenChange={setShowAddWarehouseSheet}
				onWarehouseAdded={fetchData}
			/>

			{/* Company Edit Sheet */}
			<CompanyEditSheet
				open={showEditSheet}
				onOpenChange={setShowEditSheet}
				company={company}
				onSuccess={fetchData}
			/>
		</div>
	);
}
