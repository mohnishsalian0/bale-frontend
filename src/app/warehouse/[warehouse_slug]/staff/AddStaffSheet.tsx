'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup as RadioGroupPills, RadioGroupItem as RadioGroupItemPills } from '@/components/ui/radio-group-pills';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import type { UserRole } from '@/types/database/enums';

interface AddStaffSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onStaffAdded?: () => void;
}

interface InviteFormData {
	role: UserRole;
	warehouseIds: string[];
}

type WarehouseRow = Tables<'warehouses'>;

export function AddStaffSheet({ open, onOpenChange, onStaffAdded }: AddStaffSheetProps) {
	const [formData, setFormData] = useState<InviteFormData>({
		role: 'staff',
		warehouseIds: [],
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

	const handleWarehouseToggle = (warehouseId: string) => {
		setFormData((prev) => ({
			...prev,
			warehouseIds: prev.warehouseIds.includes(warehouseId)
				? prev.warehouseIds.filter((id) => id !== warehouseId)
				: [...prev.warehouseIds, warehouseId],
		}));
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
			if (formData.role === 'staff' && formData.warehouseIds.length === 0) {
				throw new Error('Please select at least one warehouse');
			}

			// Get company name
			const { data: company } = await supabase
				.from('companies')
				.select('name')
				.eq('id', currentUser.company_id)
				.single();

			if (!company) {
				throw new Error('Failed to fetch company details');
			}

			// Set expiry to 7 days from now
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);

			// Create invite using RPC function
			const { data: token, error: inviteError } = await supabase
				.rpc('create_staff_invite', {
					p_company_id: currentUser.company_id,
					p_company_name: company.name,
					p_role: formData.role,
					p_warehouse_ids: formData.role === 'staff' ? formData.warehouseIds : null,
					p_expires_at: expiresAt.toISOString(),
					p_created_by: currentUser.id,
				});

			if (inviteError || !token) {
				throw new Error('Failed to create invite');
			}

			// Generate invite link
			const inviteUrl = `${window.location.origin}/invite/${token}`;

			// Get warehouse names for message
			const selectedWarehouses = warehouses.filter(w => formData.warehouseIds.includes(w.id));
			const warehouseNames = selectedWarehouses.map(w => w.name).join(', ');

			const systemDescription = formData.role === 'staff' && warehouseNames
				? `${warehouseNames} inventory system`
				: 'our inventory system';

			const whatsappMessage = `Hi,

You've been invited to join ${company.name} and get access to ${systemDescription} as ${formData.role === 'admin' ? 'Admin' : 'Staff'}.

Here's your invite link:
🔗 ${inviteUrl}

📅 Please note: This link is valid for 7 days.

We're excited to have you onboard with us!

Best regards,
${company.name} Team`;

			const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

			// Open WhatsApp
			window.open(whatsappUrl, '_blank');

			// Reset form
			setFormData({
				role: 'staff',
				warehouseIds: [],
			});

			// Close sheet
			onOpenChange(false);

			// Notify parent
			onStaffAdded?.();
		} catch (error) {
			console.error('Error creating invite:', error);
			setSendError(error instanceof Error ? error.message : 'Failed to create invite');
		} finally {
			setSending(false);
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="h-[90vh]">
				<div className="flex flex-col h-full max-w-md mx-auto">
					<SheetHeader>
						<SheetTitle className="text-2xl">Invite Staff Member</SheetTitle>
					</SheetHeader>

					<form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden mt-6">
						<div className="flex-1 overflow-y-auto space-y-6">
							{/* Role Selection */}
							<div className="space-y-3">
								<Label className="text-base font-medium">Role</Label>
								<RadioGroupPills
									value={formData.role}
									onValueChange={(value) =>
										setFormData({ ...formData, role: value as UserRole, warehouseIds: [] })
									}
									className="grid grid-cols-2 gap-3"
								>
									<div>
										<RadioGroupItemPills value="staff" id="role-staff" className="peer sr-only" />
										<Label
											htmlFor="role-staff"
											className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-primary-500 peer-data-[state=checked]:bg-primary-50 cursor-pointer transition-all"
										>
											<span className="text-sm font-medium">Staff</span>
										</Label>
									</div>
									<div>
										<RadioGroupItemPills value="admin" id="role-admin" className="peer sr-only" />
										<Label
											htmlFor="role-admin"
											className="flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-primary-500 peer-data-[state=checked]:bg-primary-50 cursor-pointer transition-all"
										>
											<span className="text-sm font-medium">Admin</span>
										</Label>
									</div>
								</RadioGroupPills>
							</div>

							{/* Warehouse Selection - Only for Staff */}
							{formData.role === 'staff' && (
								<div className="space-y-3">
									<Label className="text-base font-medium">Assign Warehouses</Label>
									{loadingWarehouses ? (
										<p className="text-sm text-gray-500">Loading warehouses...</p>
									) : warehouses.length === 0 ? (
										<p className="text-sm text-gray-500">No warehouses available</p>
									) : (
										<div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
											{warehouses.map((warehouse) => (
												<div key={warehouse.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
													<Checkbox
														id={`warehouse-${warehouse.id}`}
														checked={formData.warehouseIds.includes(warehouse.id)}
														onCheckedChange={() => handleWarehouseToggle(warehouse.id)}
													/>
													<Label
														htmlFor={`warehouse-${warehouse.id}`}
														className="flex-1 cursor-pointer text-sm font-normal"
													>
														{warehouse.name}
													</Label>
												</div>
											))}
										</div>
									)}
									{formData.warehouseIds.length > 0 && (
										<p className="text-sm text-gray-600">
											{formData.warehouseIds.length} warehouse{formData.warehouseIds.length > 1 ? 's' : ''} selected
										</p>
									)}
								</div>
							)}

							{sendError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
									<p className="text-sm text-red-600">{sendError}</p>
								</div>
							)}
						</div>

						<SheetFooter className="flex-row gap-3 mt-6">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								className="flex-1"
								disabled={sending}
							>
								Cancel
							</Button>
							<Button type="submit" className="flex-1" disabled={sending}>
								{sending ? 'Creating Invite...' : 'Create & Share'}
							</Button>
						</SheetFooter>
					</form>
				</div>
			</SheetContent>
		</Sheet>
	);
}
