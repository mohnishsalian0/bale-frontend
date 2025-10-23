'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IconMapPin, IconPhone, IconPlus, IconSearch } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type PartnerType = 'customer' | 'supplier' | 'vendor' | 'agent';

interface Partner {
	id: string;
	name: string;
	type: PartnerType;
	amount?: number;
	transactionType?: 'sales' | 'purchase';
	address?: string;
	phone?: string;
}

// Mock data
const PARTNERS: Partner[] = [
	{
		id: '1',
		name: 'Loom & Layer',
		type: 'supplier',
		amount: 21203,
		transactionType: 'purchase',
		address: '17, Cotton Market Road',
		phone: '9876543210',
	},
	{
		id: '2',
		name: 'Urban Drape',
		type: 'customer',
		amount: 46439,
		transactionType: 'sales',
		address: '17, Cotton Market Road',
		phone: '9876543210',
	},
	{
		id: '3',
		name: 'WeaveWorks',
		type: 'vendor',
		amount: 31933,
		transactionType: 'purchase',
		address: '17, Cotton Market Road',
		phone: '9876543210',
	},
	{
		id: '4',
		name: 'Ankit Swadesh',
		type: 'agent',
		address: undefined,
		phone: undefined,
	},
];

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
			return 'Goods receipt';
		default:
			return 'Job work';
	}
}

export default function PartnersPage() {
	const [selectedType, setSelectedType] = useState<PartnerType>('customer');
	const [searchQuery, setSearchQuery] = useState('');

	const filteredPartners = PARTNERS.filter((partner) => {
		const matchesType = partner.type === selectedType;
		const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesType && matchesSearch;
	});

	return (
		<div className="relative flex flex-col min-h-screen bg-background-100 pb-16">
			{/* Header */}
			<div className="flex items-end justify-between gap-4 p-4">
				<div className="flex-1">
					<div className="mb-2">
						<h1 className="text-3xl font-bold text-gray-900">Partners</h1>
						<p className="text-sm text-gray-500">
							<span className="text-teal-700">₹40,000 sales</span>
							{' • '}
							<span className="text-yellow-700">₹20,000 purchase</span>
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
						className="object-contain"
					/>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className="flex gap-2.5 px-4 py-2">
				{PARTNER_TYPES.map((type) => (
					<button
						key={type.value}
						onClick={() => setSelectedType(type.value)}
						className={`px-2 py-1 text-sm font-medium rounded-lg border transition-colors ${selectedType === type.value
							? 'bg-primary-200 border-primary-500 text-gray-700 shadow-primary-sm'
							: 'bg-base-white border-gray-200 text-gray-700 shadow-gray-sm'
							}`}
					>
						{type.label}
					</button>
				))}
			</div>

			{/* Partner Cards */}
			<div className="flex flex-col gap-4 p-4">
				{filteredPartners.map((partner) => (
					<Card
						key={partner.id}
						className="shadow-gray-md border-gray-300"
					>
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
				))}
			</div>

			{/* Floating Action Button */}
			<Button
				size="icon"
				className="fixed bottom-20 right-4 size-14 rounded-full bg-primary-700 border-primary-800 border shadow-dark-primary-md active:shadow-dark-primary-sm active:translate-y-0.5 transition-all hover:bg-primary-700"
			>
				<IconPlus className="size-6 text-base-white" />
			</Button>
		</div>
	);
}
