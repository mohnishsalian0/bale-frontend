'use client';

import { useState, useEffect } from 'react';
import { IconPhone, IconMapPin } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup as RadioGroupPills, RadioGroupItem as RadioGroupItemPills } from '@/components/ui/radio-group-pills';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import type { TablesInsert, Tables } from '@/types/database/supabase';
import type { UserRole } from '@/types/database/enums';

interface AddStaffSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onStaffAdded?: () => void;
}

interface InviteFormData {
	role: UserRole;
	phoneNumber: string;
	warehouseId: string;
}

type WarehouseRow = Tables<'warehouses'>;

export function AddStaffSheet({ open, onOpenChange, onStaffAdded }: AddStaffSheetProps) {
	const [formData, setFormData] = useState<InviteFormData>({
		role: 'staff',
		phoneNumber: '',
		warehouseId: '',
	});

	const [sending, setSending] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);
	const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
	const [loadingWarehouses, setLoadingWarehouses] = useState(false);

	const supabase = createClient();

	// Fetch warehouses when sheet opens
	useEffect(() => {
		if (open) {
			fetchWarehouses();
		}
	}, [open]);

	const fetchWarehouses = async () => {
		try {
			setLoadingWarehouses(true);
			const { data, error } = await supabase
				.from('warehouses')
				.select('*')
				.order('name', { ascending: true });

			if (error) throw error;
			setWarehouses(data || []);
		} catch (error) {
			console.error('Error fetching warehouses:', error);
		} finally {
			setLoadingWarehouses(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSending(true);
		setSendError(null);

		try {
			const supabase = createClient();

			// Get current user
			const currentUser = await getCurrentUser();
			if (!currentUser || !currentUser.company_id) {
				throw new Error('User not found');
			}

			// Validate warehouse assignment for staff role
			if (formData.role === 'staff' && !formData.warehouseId) {
				throw new Error('Please select a warehouse');
			}

			// Validate phone number
			if (!formData.phoneNumber || formData.phoneNumber.trim().length === 0) {
				throw new Error('Please enter a phone number');
			}

			// Get company and warehouse names
			const { data: company } = await supabase
				.from('companies')
				.select('name')
				.eq('id', currentUser.company_id)
				.single();

			const { data: warehouse } = await supabase
				.from('warehouses')
				.select('name')
				.eq('id', formData.warehouseId)
				.single();

			if (!company || !warehouse) {
				throw new Error('Failed to fetch company or warehouse details');
			}

			// Create invite token
			const token = crypto.randomUUID();
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

			// Insert invite record
			const inviteInsert: TablesInsert<'invites'> = {
				company_id: currentUser.company_id,
				company_name: company.name,
				warehouse_id: formData.warehouseId,
				warehouse_name: warehouse.name,
				role: formData.role,
				token: token,
				expires_at: expiresAt.toISOString(),
				created_by: currentUser.id,
			};

			const { data: invite, error: insertError } = await supabase
				.from('invites')
				.insert(inviteInsert)
				.select()
				.single();

			if (insertError) throw insertError;

			// Generate invite link
			const inviteUrl = `${window.location.origin}/invite/${token}`;

			// TODO: Send SMS/WhatsApp to phone number with invite link
			console.log('Send invite to:', formData.phoneNumber);
			console.log('Invite URL:', inviteUrl);

			// For now, just copy to clipboard
			await navigator.clipboard.writeText(inviteUrl);
			alert(`Invite link copied to clipboard!\nSend this to ${formData.phoneNumber}:\n${inviteUrl}`);

			// Success! Close sheet and notify parent
			handleCancel();
			if (onStaffAdded) {
				onStaffAdded();
			}
		} catch (error) {
			console.error('Error sending invite:', error);
			setSendError(error instanceof Error ? error.message : 'Failed to send invite');
		} finally {
			setSending(false);
		}
	};

	const handleCancel = () => {
		// Reset form
		setFormData({
			role: 'staff',
			phoneNumber: '',
			warehouseId: '',
		});
		setSendError(null);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				{/* Header */}
				<SheetHeader>
					<SheetTitle>Staff invite</SheetTitle>
				</SheetHeader>

				{/* Form Content - Scrollable */}
				<form onSubmit={handleSubmit} className="flex flex-col h-full">
					<div className="flex-1 overflow-y-auto">
						<div className="flex flex-col gap-6 px-4 py-5">
							{/* Phone Number */}
							<div className="flex flex-col gap-2">
								<label className="text-sm font-medium text-gray-700">
									Phone Number <span className="text-red-600">*</span>
								</label>
								<div className="relative">
									<IconPhone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
									<Input
										type="tel"
										placeholder="Enter phone number"
										value={formData.phoneNumber}
										onChange={(e) =>
											setFormData({ ...formData, phoneNumber: e.target.value })
										}
										className="pl-12"
										required
									/>
								</div>
							</div>

							{/* Role Selection */}
							<div className="flex flex-col gap-2">
								<label className="text-sm font-medium text-gray-700">Role</label>
								<RadioGroupPills
									value={formData.role}
									onValueChange={(value) =>
										setFormData({ ...formData, role: value as UserRole, warehouseId: value === 'admin' ? '' : formData.warehouseId })
									}
									name="role"
								>
									<RadioGroupItemPills value="admin">Admin</RadioGroupItemPills>
									<RadioGroupItemPills value="staff">Staff</RadioGroupItemPills>
								</RadioGroupPills>
							</div>

							{/* Warehouse Assignment (only for staff) */}
							{formData.role === 'staff' && (
								<div className="flex flex-col gap-3">
									<label className="text-sm font-medium text-gray-700">
										Assign warehouse
									</label>
									{loadingWarehouses ? (
										<p className="text-sm text-gray-500">Loading warehouses...</p>
									) : (
										<RadioGroup
											value={formData.warehouseId}
											onValueChange={(value) =>
												setFormData({ ...formData, warehouseId: value })
											}
											className="gap-3"
										>
											{warehouses.map((warehouse) => (
												<div key={warehouse.id} className="flex items-start space-x-2">
													<RadioGroupItem value={warehouse.id} id={`warehouse-${warehouse.id}`} className="mt-1.5" />
													<Label
														htmlFor={`warehouse-${warehouse.id}`}
														className="flex flex-col items-start gap-0 cursor-pointer flex-1"
													>
														<span className="text-base font-normal text-gray-900">{warehouse.name}</span>
														<span className="text-xs font-normal text-gray-500 leading-relaxed">
															{warehouse.address_line1 || 'No address'}
														</span>
													</Label>
												</div>
											))}
										</RadioGroup>
									)}
								</div>
							)}
						</div>
					</div>

					<SheetFooter>
						{sendError && (
							<p className="text-sm text-red-600 text-center">{sendError}</p>
						)}
						<div className="flex gap-3">
							<Button
								type="button"
								variant="outline"
								onClick={handleCancel}
								disabled={sending}
								className="flex-1"
							>
								Cancel
							</Button>
							<Button type="submit" disabled={sending} className="flex-1">
								{sending ? 'Sending...' : 'Send invite'}
							</Button>
						</div>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
