'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconMapPin, IconPhone, IconPlus, IconSearch } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fab } from '@/components/ui/fab';
import { TabPills } from '@/components/ui/tab-pills';
import { LoadingState } from '@/components/layouts/loading-state';
import { AddPartnerSheet } from './AddPartnerSheet';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import type { PartnerType } from '@/types/database/enums';

type PartnerRow = Tables<'partners'>;

interface Partner {
	id: string;
	name: string;
	type: PartnerType;
	amount?: number;
	transactionType?: 'sales' | 'purchase';
	address?: string;
	phone?: string;
}

const PARTNER_TYPES: { value: PartnerType; label: string }[] = [
	{ value: 'customer', label: 'Customer' },
	{ value: 'supplier', label: 'Supplier' },
	{ value: 'vendor', label: 'Vendor' },
	{ value: 'agent', label: 'Agent' },
];

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((word) => word[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

function getActionLabel(type: PartnerType): string {
	switch (type) {
		case 'customer':
			return 'Sales order';
		case 'supplier':
		case 'vendor':
			return 'Goods inward';
		default:
			return 'Job work';
	}
}

export default function PartnersPage() {
	const [selectedType, setSelectedType] = useState<PartnerType>('customer');
	const [searchQuery, setSearchQuery] = useState('');
	const [partners, setPartners] = useState<Partner[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddPartner, setShowAddPartner] = useState(false);

	const supabase = createClient();

	const fetchPartners = async () => {
		try {
			setLoading(true);
			setError(null);

			const { data, error: fetchError } = await supabase
				.from('partners')
				.select('*')
				.eq('partner_type', selectedType)
				.order('first_name', { ascending: true });

			if (fetchError) throw fetchError;

			// Transform data to match Partner interface
			const transformedPartners: Partner[] = (data || []).map((p: PartnerRow) => ({
				id: p.id,
				name: `${p.first_name} ${p.last_name}`.trim(),
				type: p.partner_type as PartnerType,
				address: [p.address_line1, p.city, p.state]
					.filter(Boolean)
					.join(', ') || undefined,
				phone: p.phone_number || undefined,
				// TODO: Fetch transaction amounts from orders/inwards
				amount: undefined,
				transactionType: undefined,
			}));

			setPartners(transformedPartners);
		} catch (err) {
			console.error('Error fetching partners:', err);
			setError(err instanceof Error ? err.message : 'Failed to load partners');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPartners();
	}, [selectedType]);

	const filteredPartners = partners.filter((partner) => {
		const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	// Loading state
	if (loading) {
		return <LoadingState message="Loading partners..." />;
	}

	// Error state
	if (error) {
		return (
			<div className="relative flex flex-col min-h-screen pb-16">
				<div className="flex items-center justify-center h-screen p-4">
					<div className="flex flex-col items-center gap-3 text-center max-w-md">
						<div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
							<span className="text-2xl">⚠️</span>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Failed to load partners</h2>
						<p className="text-sm text-gray-600">{error}</p>
						<Button onClick={() => window.location.reload()} variant="outline" size="sm">
							Try again
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-screen pb-16">
			{/* Header */}
			<div className="flex items-end justify-between gap-4 p-4">
				<div className="flex-1">
					<div className="mb-2">
						<h1 className="text-3xl font-bold text-gray-900">Partners</h1>
						<p className="text-sm text-gray-500">
							<span className="text-teal-700 font-medium">₹40,000 sales</span>
							{' • '}
							<span className="text-yellow-700 font-medium">₹20,000 purchase</span>
							{' in past month'}
						</p>
					</div>

					{/* Search */}
					<div className="relative max-w-md">
						<Input
							type="text"
							placeholder="Search for partner"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pr-10"
						/>
						<IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
					</div>
				</div>

				{/* Mascot */}
				<div className="relative size-25 shrink-0">
					<Image
						src="/mascot/partner-handshake.png"
						alt="Partners"
						fill
						sizes="100px"
						className="object-contain"
					/>
				</div>
			</div>

			{/* Filter */}
			<div className="px-4 py-2">
				<TabPills
					options={PARTNER_TYPES}
					value={selectedType}
					onValueChange={(value) => setSelectedType(value as PartnerType)}
				/>
			</div>

			{/* Partner Cards */}
			<li className="flex flex-col gap-4 p-4">
				{filteredPartners.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-600 mb-2">No partners found</p>
						<p className="text-sm text-gray-500">
							{searchQuery
								? 'Try adjusting your search'
								: `Add your first ${selectedType.toLowerCase()}`}
						</p>
					</div>
				) : (
					filteredPartners.map((partner) => (
						<ul
							key={partner.id}
						>
							<Card>
								<CardContent className="p-4 pb-3 flex flex-col gap-4">
									{/* Partner Info */}
									<div className="flex gap-4">
										{/* Avatar */}
										<div className="flex items-center justify-center size-18 rounded-full bg-gray-200 shrink-0">
											<span className="text-xl font-semibold text-gray-700">
												{getInitials(partner.name)}
											</span>
										</div>

										{/* Details */}
										<div className="flex-1 flex justify-between py-2">
											<div className="flex flex-col">
												<p className="text-base font-medium text-gray-900">
													{partner.name}
												</p>
												<p className="text-xs text-gray-500">
													{PARTNER_TYPES.find((t) => t.value === partner.type)?.label}
												</p>
											</div>

											{/* Amount */}
											{partner.amount && (
												<div className="flex flex-col items-end justify-center">
													<p
														className={`text-base font-bold ${partner.transactionType === 'sales'
															? 'text-teal-700'
															: 'text-yellow-700'
															}`}
													>
														₹{partner.amount.toLocaleString('en-IN')}
													</p>
													<p className="text-xs text-gray-500">
														in {partner.transactionType}
													</p>
												</div>
											)}
										</div>
									</div>

									{/* Contact Info */}
									<div className="flex gap-6 px-2 text-sm">
										<div className="flex gap-1.5 items-center">
											<IconMapPin className="size-4 text-gray-500" />
											<span className="text-gray-700">
												{partner.address || 'No address'}
											</span>
										</div>
										<div className="flex gap-1.5 items-center">
											<IconPhone className="size-4 text-primary-700" />
											<span className={partner.phone ? 'text-primary-700 font-medium' : 'text-gray-700'}>
												{partner.phone || 'No phone number'}
											</span>
										</div>
									</div>
								</CardContent>

								<CardFooter className="px-6 pb-4 pt-0">
									<Button variant="ghost" size="sm" className='text-primary-700'>
										<IconPlus className="size-4" />
										{getActionLabel(partner.type)}
									</Button>
								</CardFooter>
							</Card>
						</ul>
					))
				)}
			</li>

			{/* Floating Action Button */}
			<Fab
				onClick={() => setShowAddPartner(true)}
				className="fixed bottom-20 right-4"
			/>

			{/* Add Partner Sheet */}
			{showAddPartner && (
				<AddPartnerSheet
					open={showAddPartner}
					onOpenChange={setShowAddPartner}
					onPartnerAdded={fetchPartners}
				/>
			)}
		</div >
	);
}
