'use client';

import { useState } from 'react';
import { IconMailOpened, IconBrandWhatsapp, IconCopy, IconTrash, IconClock } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatExpiryDate } from '@/lib/utils/date';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database/enums';
import { RoleBadge } from '@/components/ui/role-badge';

interface ActiveInvite {
	id: string;
	role: UserRole;
	warehouseNames: string[];
	companyName: string;
	token: string;
	expiresAt: string;
	createdAt: string;
}

interface ActiveInvitesTabProps {
	invites: ActiveInvite[];
	onInviteDeleted: () => void;
}

export function ActiveInvitesTab({ invites, onInviteDeleted }: ActiveInvitesTabProps) {
	const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
	const supabase = createClient();

	const handleShareWhatsApp = (invite: ActiveInvite) => {
		const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
		const warehouseText =
			invite.warehouseNames.length > 0 ? invite.warehouseNames.join(', ') : '';
		const systemDescription =
			invite.role === 'staff' && warehouseText
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
			const { error } = await supabase.from('invites').delete().eq('id', id);

			if (error) throw error;

			toast.success('Invite revoked successfully');
			setDeletingInviteId(null);
			onInviteDeleted();
		} catch (err) {
			console.error('Error revoking invite:', err);
			toast.error('Failed to revoke invite');
			setDeletingInviteId(null);
		}
	};

	const handleCancelDelete = () => {
		setDeletingInviteId(null);
	};

	return (
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
											<p
												title={invite.warehouseNames.join(', ')}
												className="text-gray-900 truncate font-medium"
											>
												{invite.warehouseNames.length === 1
													? invite.warehouseNames[0]
													: `${invite.warehouseNames[0]}, +${invite.warehouseNames.length - 1} more`}
											</p>
										) : (
											<p className="text-gray-900 font-medium">{invite.companyName}</p>
										)}

										{/* Expiry */}
										<div className="flex gap-1.5 items-center">
											<IconClock className="size-4 shrink-0 text-gray-500" />
											<p
												className={`text-sm ${expiry.status === 'expired'
													? 'text-red-600'
													: expiry.status === 'urgent'
														? 'text-orange-600'
														: 'text-gray-500'
													}`}
											>
												{expiry.text}
											</p>
										</div>
									</div>

									{/* Role Badge */}
									<RoleBadge role={invite.role} />
								</div>

								{/* Action Buttons */}
								<div className="flex gap-2 w-full">
									{deletingInviteId === invite.id ? (
										<>
											<Button variant="ghost" className="flex-1" onClick={handleCancelDelete}>
												Cancel
											</Button>
											<Button
												variant="ghost"
												className="flex-1 hover:bg-red-200 hover:text-red-700"
												onClick={() => handleConfirmDelete(invite.id)}
											>
												Confirm delete
											</Button>
										</>
									) : (
										<>
											<Button variant="ghost" onClick={() => handleShareWhatsApp(invite)}>
												<IconBrandWhatsapp />
												Share on WhatsApp
											</Button>
											<Button
												variant="ghost"
												size="icon"
												title="Copy invite link"
												onClick={() => handleCopyLink(invite.token)}
											>
												<IconCopy />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="hover:bg-red-200 hover:text-red-700"
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
	);
}
