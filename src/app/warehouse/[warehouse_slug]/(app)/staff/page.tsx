'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconBuilding, IconPhone, IconMailOpened, IconBrandWhatsapp, IconCopy, IconTrash, IconClock } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Fab } from '@/components/ui/fab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabPills } from '@/components/ui/tab-pills';
import { LoadingState } from '@/components/layouts/loading-state';
import { AddStaffSheet } from './AddStaffSheet';
import { createClient } from '@/lib/supabase/client';
import { formatExpiryDate } from '@/lib/utils/date';
import { toast } from 'sonner';
import type { UserRole } from '@/types/database/enums';
import { ErrorState } from '@/components/layouts/error-state';

interface StaffMember {
	id: string;
	name: string;
	phoneNumber: string | null;
	warehouseNames: string[];
	profileImageUrl: string | null;
}

interface ActiveInvite {
	id: string;
	role: UserRole;
	warehouseNames: string[];
	companyName: string;
	token: string;
	expiresAt: string;
	createdAt: string;
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
	const [activeTab, setActiveTab] = useState<'staff' | 'invites'>('staff');
	const [staff, setStaff] = useState<StaffMember[]>([]);
	const [invites, setInvites] = useState<ActiveInvite[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddStaff, setShowAddStaff] = useState(false);
	const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);

	const supabase = createClient();

	const fetchStaff = async () => {
		try {
			setLoading(true);
			setError(null);

			const { data: usersData, error: fetchError } = await supabase
				.from('users')
				.select('id, first_name, last_name, phone_number, profile_image_url')
				.order('first_name', { ascending: true });

			if (fetchError) throw fetchError;

			// Fetch warehouse assignments for each user
			const staffWithWarehouses = await Promise.all(
				(usersData || []).map(async (user: any) => {
					const { data: userWarehouses } = await supabase
						.from('user_warehouses')
						.select(`
							warehouses (name)
						`)
						.eq('user_id', user.id);

					const warehouseNames = (userWarehouses || [])
						.map((uw: any) => uw.warehouses?.name)
						.filter(Boolean);

					return {
						id: user.id,
						name: `${user.first_name} ${user.last_name}`.trim(),
						phoneNumber: user.phone_number,
						warehouseNames,
						profileImageUrl: user.profile_image_url,
					};
				})
			);

			setStaff(staffWithWarehouses);
		} catch (err) {
			console.error('Error fetching staff:', err);
			setError(err instanceof Error ? err.message : 'Failed to load staff');
		} finally {
			setLoading(false);
		}
	};

	const fetchInvites = async () => {
		try {
			setLoading(true);
			setError(null);

			const { data: invitesData, error: fetchError } = await supabase
				.from('invites')
				.select('*')
				.is('used_at', null)
				.gt('expires_at', new Date().toISOString())
				.order('created_at', { ascending: false });

			if (fetchError) throw fetchError;

			// Fetch warehouse names for each invite
			const invitesWithWarehouses = await Promise.all(
				(invitesData || []).map(async (invite: any) => {
					const { data: inviteWarehouses } = await supabase
						.from('invite_warehouses')
						.select(`
							warehouses (name)
						`)
						.eq('invite_id', invite.id);

					const warehouseNames = (inviteWarehouses || [])
						.map((iw: any) => iw.warehouses?.name)
						.filter(Boolean);

					return {
						id: invite.id,
						role: invite.role,
						warehouseNames,
						companyName: invite.company_name,
						token: invite.token,
						expiresAt: invite.expires_at,
						createdAt: invite.created_at,
					};
				})
			);

			setInvites(invitesWithWarehouses);
		} catch (err) {
			console.error('Error fetching invites:', err);
			setError(err instanceof Error ? err.message : 'Failed to load invites');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (activeTab === 'staff') {
			fetchStaff();
		} else {
			fetchInvites();
		}
	}, [activeTab]);

	const handleShareWhatsApp = (invite: ActiveInvite) => {
		const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
		const warehouseText = invite.warehouseNames.length > 0
			? invite.warehouseNames.join(', ')
			: '';
		const systemDescription = invite.role === 'staff' && warehouseText
			? `${warehouseText} inventory system`
			: 'our inventory system';

		const whatsappMessage = `Hi,

You've been invited to join ${invite.companyName} and get access to ${systemDescription} as ${invite.role === 'admin' ? 'Admin' : 'Staff'}.

Here's your invite link:
🔗 ${inviteUrl}

📅 Please note: This link is valid for 7 days.

We're excited to have you onboard with us!

Thanks,
The Bale Team`;

		const encodedMessage = encodeURIComponent(whatsappMessage);
		window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
	};

	const handleCopyLink = async (token: string) => {
		try {
			const inviteUrl = `${window.location.origin}/invite/${token}`;
			await navigator.clipboard.writeText(inviteUrl);
			toast.success('Invite link copied to clipboard!');
		} catch (err) {
			console.error('Failed to copy:', err);
			toast.error('Failed to copy link');
		}
	};

	const handleDeleteClick = (id: string) => {
		setDeletingInviteId(id);
	};

	const handleConfirmDelete = async (id: string) => {
		try {
			const { error } = await supabase
				.from('invites')
				.delete()
				.eq('id', id);

			if (error) throw error;

			toast.success('Invite revoked successfully');
			setDeletingInviteId(null);
			// Refresh invites list
			fetchInvites();
		} catch (err) {
			console.error('Error revoking invite:', err);
			toast.error('Failed to revoke invite');
			setDeletingInviteId(null);
		}
	};

	const handleCancelDelete = () => {
		setDeletingInviteId(null);
	};

	// Loading state
	if (loading) {
		return <LoadingState message={activeTab === 'staff' ? 'Loading staff...' : 'Loading invites...'} />;
	}

	// Error state
	if (error) {
		return (
			<ErrorState
				title={activeTab === 'staff' ? 'Failed to load staff' : 'Failed to load invites'}
				message={error}
				onRetry={() => window.location.reload()}
			/>
		);
	}

	return (
		<div className="relative flex flex-col min-h-dvh pb-16">
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

			{/* Tabs */}
			<div className="px-4 py-2">
				<TabPills
					options={[
						{ value: 'staff', label: 'Staff Members' },
						{ value: 'invites', label: 'Active Invites' },
					]}
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as 'staff' | 'invites')}
				/>
			</div>

			{/* Staff Cards Grid */}
			{activeTab === 'staff' && (
				<li className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 items-stretch p-4">
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
										<div className="flex items-center justify-center size-16 rounded-full bg-gray-200 shrink-0">
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
											<div className="flex gap-1.5 items-center justify-center text-gray-500 w-full">
												<IconBuilding className="size-3.5 shrink-0" />
												<p title={member.warehouseNames.length > 0 ? member.warehouseNames.join(', ') : 'Not assigned yet'} className="text-xs text-gray-500 truncate">
													{member.warehouseNames.length > 0
														? member.warehouseNames.length === 1
															? member.warehouseNames[0]
															: `${member.warehouseNames[0]}, +${member.warehouseNames.length - 1} more`
														: 'Not assigned yet'
													}
												</p>
											</div>

											{/* Phone */}
											<div className="flex gap-1.5 items-center justify-center text-gray-500 w-full">
												<IconPhone className="size-3.5 shrink-0" />
												<p className="text-xs text-gray-500">
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
			)}

			{/* Active Invites Grid */}
			{activeTab === 'invites' && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
					{invites.length === 0 ? (
						<div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
							<p className="text-gray-600 mb-2">No active invites</p>
							<p className="text-sm text-gray-500">Create a new invite to get started</p>
						</div>
					) : (
						invites.map((invite) => {
							const expiry = formatExpiryDate(invite.expiresAt);
							return (
								<Card key={invite.id}>
									<CardContent className="p-4 flex flex-col gap-6 h-full">
										{/* Top Row: Icon, Info, Badge */}
										<div className="flex gap-3 items-start w-full">
											{/* Mail Icon */}
											<div className="relative size-12 rounded-lg shrink-0 bg-gray-200 overflow-hidden">
												<div className="flex items-center justify-center size-full">
													<IconMailOpened className="size-6 text-gray-400" />
												</div>
											</div>

											{/* Warehouse & Expiry Info */}
											<div className="flex-1 flex flex-col gap-0.5 min-w-0">
												{/* Warehouse (only for staff) */}
												{invite.role === 'staff' && invite.warehouseNames.length > 0 ? (
													<p title={invite.warehouseNames.join(', ')} className="text-gray-900 truncate font-medium">
														{invite.warehouseNames.length === 1
															? invite.warehouseNames[0]
															: `${invite.warehouseNames[0]}, +${invite.warehouseNames.length - 1} more`
														}
													</p>
												) : (
													<p className="text-gray-900 font-medium">
														{invite.companyName}
													</p>
												)}

												{/* Expiry */}
												<div className="flex gap-1.5 items-center">
													<IconClock className="size-4 shrink-0 text-gray-500" />
													<p className={`text-sm ${expiry.status === 'expired' ? 'text-red-600' :
														expiry.status === 'urgent' ? 'text-orange-600' :
															'text-gray-500'
														}`}>
														{expiry.text}
													</p>
												</div>
											</div>

											{/* Role Badge */}
											<Badge color={invite.role === 'admin' ? 'blue' : 'green'}>
												{invite.role === 'admin' ? 'Admin' : 'Staff'}
											</Badge>
										</div>

										{/* Action Buttons */}
										<div className="flex gap-2 w-full">
											{deletingInviteId === invite.id ? (
												<>
													<Button
														variant="ghost"
														className="flex-1"
														onClick={handleCancelDelete}
													>
														Cancel
													</Button>
													<Button
														variant="ghost"
														className='flex-1 hover:bg-red-200 hover:text-red-700'
														onClick={() => handleConfirmDelete(invite.id)}
													>
														Confirm delete
													</Button>
												</>
											) : (
												<>
													<Button
														variant="ghost"
														onClick={() => handleShareWhatsApp(invite)}
													>
														<IconBrandWhatsapp />
														Share on WhatsApp
													</Button>
													<Button
														variant="ghost"
														size="icon"
														title='Copy invite link'
														onClick={() => handleCopyLink(invite.token)}
													>
														<IconCopy />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className='hover:bg-red-200 hover:text-red-700'
														onClick={() => handleDeleteClick(invite.id)}
													>
														<IconTrash />
													</Button>
												</>
											)}
										</div>
									</CardContent>
								</Card>
							);
						})
					)}
				</div>
			)}

			{/* Floating Action Button */}
			<Fab
				onClick={() => setShowAddStaff(true)}
				className="fixed bottom-20 right-4"
			/>

			{/* Add Staff Sheet */}
			{showAddStaff && (
				<AddStaffSheet
					open={showAddStaff}
					onOpenChange={setShowAddStaff}
					onStaffAdded={() => {
						// Refresh invites when a new invite is created
						if (activeTab === 'invites') {
							fetchInvites();
						}
					}}
				/>
			)}
		</div>
	);
}
