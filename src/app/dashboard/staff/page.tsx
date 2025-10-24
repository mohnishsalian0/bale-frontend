'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconBuilding, IconPhone, IconPlus } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddStaffSheet } from './AddStaffSheet';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';

type UserRow = Tables<'users'>;
type WarehouseRow = Tables<'warehouses'>;

interface StaffMember {
	id: string;
	name: string;
	phoneNumber: string | null;
	warehouseName: string | null;
	profileImageUrl: string | null;
}

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((word) => word[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

export default function StaffPage() {
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddStaff, setShowAddStaff] = useState(false);

	const supabase = createClient();

	const fetchStaff = async () => {
		try {
			setLoading(true);
			setError(null);

			const { data, error: fetchError } = await supabase
				.from('users')
				.select(`
					id,
					first_name,
					last_name,
					phone_number,
					profile_image_url,
					warehouse_id,
					warehouses!fk_user_warehouse (
						name
					)
				`)
				.order('first_name', { ascending: true });

			if (fetchError) throw fetchError;

			// Transform data to match StaffMember interface
			const transformedStaff: StaffMember[] = (data || []).map((user: any) => ({
				id: user.id,
				name: `${user.first_name} ${user.last_name}`.trim(),
				phoneNumber: user.phone_number,
				warehouseName: user.warehouses?.name || null,
				profileImageUrl: user.profile_image_url,
			}));

			setStaff(transformedStaff);
		} catch (err) {
			console.error('Error fetching staff:', err);
			setError(err instanceof Error ? err.message : 'Failed to load staff');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStaff();
	}, []);

	// Loading state
	if (loading) {
		return (
			<div className="relative flex flex-col min-h-screen pb-16">
				<div className="flex items-center justify-center h-screen">
					<div className="flex flex-col items-center gap-3">
						<div className="size-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
						<p className="text-sm text-gray-600">Loading staff...</p>
					</div>
				</div>
			</div>
		);
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
						<h2 className="text-lg font-semibold text-gray-900">Failed to load staff</h2>
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
				<h1 className="text-3xl font-bold text-gray-900">Staff</h1>

				{/* Mascot */}
				<div className="relative size-24 shrink-0">
					<Image
						src="/mascot/staff-trolley.png"
						alt="Staff"
						fill
						className="object-contain"
					/>
				</div>
			</div>

			{/* Staff Cards Grid */}
			<li className="grid grid-cols-2 gap-4 p-4">
				{staff.length === 0 ? (
					<div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-600 mb-2">No staff members found</p>
						<p className="text-sm text-gray-500">Add your first staff member</p>
					</div>
				) : (
					staff.map((member) => (
						<ul key={member.id}>
							<Card
								className="min-h-[180px]"
							>
								<CardContent className="p-4 flex flex-col gap-3 items-center h-full">
									{/* Avatar */}
									<div className="flex items-center justify-center size-16 rounded-full bg-neutral-200 shrink-0">
										{member.profileImageUrl ? (
											<Image
												src={member.profileImageUrl}
												alt={member.name}
												width={64}
												height={64}
												className="rounded-full object-cover"
											/>
										) : (
											<span className="text-lg font-medium text-gray-700">
												{getInitials(member.name)}
											</span>
										)}
									</div>

									{/* Details */}
									<div className="flex flex-col gap-1 items-center w-full">
										<p className="text-base font-medium text-gray-900 text-center">
											{member.name}
										</p>

										{/* Warehouse */}
										<div className="flex gap-1.5 items-center justify-center text-neutral-500 w-full">
											<IconBuilding className="size-3.5 shrink-0" />
											<p className="text-xs text-neutral-500 truncate">
												{member.warehouseName || 'Not assigned yet'}
											</p>
										</div>

										{/* Phone */}
										<div className="flex gap-1.5 items-center justify-center text-neutral-500 w-full">
											<IconPhone className="size-3.5 shrink-0" />
											<p className="text-xs text-neutral-500">
												{member.phoneNumber || 'No phone'}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</ul>
					))
				)}
			</li>

			{/* Floating Action Button */}
			< Button
				size="icon"
				onClick={() => setShowAddStaff(true)}
				className="fixed bottom-20 right-4 size-14 rounded-full"
			>
				<IconPlus className="size-6 text-base-white" />
			</Button>

			{/* Add Staff Sheet */}
			<AddStaffSheet
				open={showAddStaff}
				onOpenChange={setShowAddStaff}
				onStaffAdded={fetchStaff}
			/>
		</div>
	);
}
