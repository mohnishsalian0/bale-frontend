'use client';

import { useState, useEffect } from 'react';
import { IconChevronDown, IconCurrencyRupee, IconPhoto, IconPercentage } from '@tabler/icons-react';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { createClient, getCurrentUser } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import { DatePicker } from '@/components/ui/date-picker';
import { dateToISOString } from '@/lib/utils/date';

interface OrderFormData {
	customerId: string;
	agentId: string;
	orderDate: string;
	expectedDate: string;
	advanceAmount: string;
	discount: string;
	notes: string;
	files: File[];
}

interface OrderDetailsStepProps {
	formData: OrderFormData;
	setFormData: (data: OrderFormData) => void;
}

export function OrderDetailsStep({
	formData,
	setFormData,
}: OrderDetailsStepProps) {
	const [customers, setCustomers] = useState<Tables<'partners'>[]>([]);
	const [agents, setAgents] = useState<Tables<'partners'>[]>([]);
	const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

	// Load customers and agents on mount
	useEffect(() => {
		loadPartners();
	}, []);

	const loadPartners = async () => {
		try {
			const supabase = createClient();
			const currentUser = await getCurrentUser();
			if (!currentUser || !currentUser.company_id) {
				throw new Error('User not found');
			}

			// Load customers
			const { data: customersData, error: customersError } = await supabase
				.from('partners')
				.select('*')
				.eq('company_id', currentUser.company_id)
				.eq('partner_type', 'customer')
				.order('first_name', { ascending: true });

			if (customersError) throw customersError;
			setCustomers(customersData || []);

			// Load agents
			const { data: agentsData, error: agentsError } = await supabase
				.from('partners')
				.select('*')
				.eq('company_id', currentUser.company_id)
				.eq('partner_type', 'agent')
				.order('first_name', { ascending: true });

			if (agentsError) throw agentsError;
			setAgents(agentsData || []);
		} catch (error) {
			console.error('Error loading partners:', error);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		// Filter for images and PDFs only
		const validFiles = files.filter(file => {
			const isImage = file.type.startsWith('image/');
			const isPDF = file.type === 'application/pdf';
			return isImage || isPDF;
		});
		setFormData({ ...formData, files: [...formData.files, ...validFiles] });
	};

	return (
		<div className="flex-1 overflow-y-auto">
			{/* Main Fields */}
			<div className="flex flex-col gap-5 px-4 py-5">
				{/* Customer Dropdown */}
				<Select
					value={formData.customerId}
					onValueChange={(value) => setFormData({ ...formData, customerId: value })}
					required
				>
					<SelectTrigger className="h-11">
						<SelectValue placeholder="Customer" />
					</SelectTrigger>
					<SelectContent>
						{customers.map(customer => (
							<SelectItem key={customer.id} value={customer.id}>
								{customer.first_name} {customer.last_name}
								{customer.company_name && ` - ${customer.company_name}`}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Agent Dropdown */}
				<Select
					value={formData.agentId || undefined}
					onValueChange={(value) => setFormData({ ...formData, agentId: value })}
				>
					<SelectTrigger className="h-11">
						<SelectValue placeholder="Agent (Optional)" />
					</SelectTrigger>
					<SelectContent>
						{agents.map(agent => (
							<SelectItem key={agent.id} value={agent.id}>
								{agent.first_name} {agent.last_name}
								{agent.company_name && ` - ${agent.company_name}`}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Date Fields */}
				<div className="flex gap-3">
					{/* Order Date */}
					<DatePicker
						placeholder="Order date"
						value={formData.orderDate ? new Date(formData.orderDate) : undefined}
						onChange={(date) => setFormData({
							...formData,
							orderDate: date ? dateToISOString(date) : ''
						})}
						required
						className="flex-1"
					/>

					{/* Expected Date */}
					<DatePicker
						placeholder="Expected date"
						value={formData.expectedDate ? new Date(formData.expectedDate) : undefined}
						onChange={(date) => setFormData({
							...formData,
							expectedDate: date ? dateToISOString(date) : ''
						})}
						required
						className="flex-1"
					/>
				</div>
			</div>

			{/* Additional Details Section */}
			<Collapsible
				open={showAdditionalDetails}
				onOpenChange={setShowAdditionalDetails}
				className="border-t border-gray-200 px-4 py-5"
			>
				<CollapsibleTrigger className={`flex items-center justify-between w-full ${showAdditionalDetails ? 'mb-5' : 'mb-0'}`}>
					<h3 className="text-lg font-medium text-gray-900">Additional Details</h3>
					<IconChevronDown
						className={`size-6 text-gray-500 transition-transform ${showAdditionalDetails ? 'rotate-180' : 'rotate-0'}`}
					/>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className="flex flex-col gap-5">
						{/* Advance Amount */}
						<InputWithIcon
							type="number"
							placeholder="Advance amount"
							value={formData.advanceAmount}
							onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
							icon={<IconCurrencyRupee />}
							min="0"
							step="0.01"
						/>

						{/* Discount */}
						<InputWithIcon
							type="number"
							placeholder="Discount percent"
							value={formData.discount}
							onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
							icon={<IconPercentage />}
							min="0"
							step="0.01"
						/>

						{/* Notes */}
						<Textarea
							placeholder="Enter instructions, special requirements, custom measurements, order source, etc..."
							value={formData.notes}
							onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
							className="min-h-32"
						/>

						{/* Add Files */}
						<label className="border border-primary-700 rounded-lg h-11 flex items-center justify-center gap-3 cursor-pointer text-primary-700 hover:bg-primary-50 transition-colors shadow-gray-sm">
							<IconPhoto className="size-4" />
							<span className="text-sm font-normal">Add files</span>
							<input
								type="file"
								accept="image/*,.pdf"
								multiple
								onChange={handleFileSelect}
								className="sr-only"
							/>
						</label>

						{/* File List */}
						{formData.files.length > 0 && (
							<div className="flex flex-col gap-2">
								{formData.files.map((file, index) => (
									<div key={index} className="text-sm text-gray-700 flex items-center justify-between">
										<span className="truncate">{file.name}</span>
										<button
											type="button"
											onClick={() => {
												const newFiles = formData.files.filter((_, i) => i !== index);
												setFormData({ ...formData, files: newFiles });
											}}
											className="text-red-600 hover:text-red-700 ml-2"
										>
											Remove
										</button>
									</div>
								))}
							</div>
						)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
