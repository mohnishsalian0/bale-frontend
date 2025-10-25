'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconSearch } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabPills } from '@/components/ui/tab-pills';
import { Fab } from '@/components/ui/fab';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';

type DispatchRow = Tables<'goods_dispatches'>;
type ReceiptRow = Tables<'goods_receipts'>;

interface StockFlowItem {
	id: string;
	type: 'dispatch' | 'receipt';
	productName: string;
	partnerName: string;
	date: string;
	quantity: number;
	unit: string;
	billNumber: string;
}

interface MonthGroup {
	month: string;
	monthYear: string;
	inCount: number;
	outCount: number;
	items: StockFlowItem[];
}

export default function StockFlowPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedFilter, setSelectedFilter] = useState<'all' | 'dispatch' | 'receipt'>('all');
	const [selectedPartner, setSelectedPartner] = useState('all');
	const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [totalReceived, setTotalReceived] = useState(0);
	const [totalDispatched, setTotalDispatched] = useState(0);

	const fetchStockFlow = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			// Fetch dispatches with partner details
			const { data: dispatches, error: dispatchError } = await supabase
				.from('goods_dispatches')
				.select(`
					*,
					partner:partners!goods_dispatches_partner_id_fkey(first_name, last_name, company_name),
					goods_dispatch_items(
						stock_unit:stock_units(
							product:products(name, measuring_unit),
							size_quantity
						)
					)
				`)
				.order('dispatch_date', { ascending: false });

			if (dispatchError) throw dispatchError;

			// Fetch receipts with partner details and stock units
			const { data: receipts, error: receiptError } = await supabase
				.from('goods_receipts')
				.select(`
					*,
					partner:partners!goods_receipts_partner_id_fkey(first_name, last_name, company_name),
					stock_units(
						product:products(name, measuring_unit),
						size_quantity
					)
				`)
				.order('receipt_date', { ascending: false });

			if (receiptError) throw receiptError;

			// Transform dispatches
			const dispatchItems: StockFlowItem[] = (dispatches || []).map((d) => {
				const partnerName = d.partner
					? d.partner.company_name || `${d.partner.first_name} ${d.partner.last_name}`
					: 'Unknown Partner';

				const items = d.goods_dispatch_items || [];
				const firstProduct = items[0]?.stock_unit?.product;
				const productName = firstProduct?.name || 'Unknown Product';
				const totalQty = Number(items.reduce(
					(sum: number, item) => sum + (Number(item.stock_unit?.size_quantity) || 0),
					0
				).toFixed(2));
				const unit = firstProduct?.measuring_unit || 'm';

				return {
					id: d.id,
					type: 'dispatch',
					productName,
					partnerName,
					date: d.dispatch_date,
					quantity: totalQty,
					unit,
					billNumber: d.dispatch_number,
				};
			});

			// Transform receipts
			const receiptItems: StockFlowItem[] = (receipts || []).map((r) => {
				const partnerName = r.partner
					? r.partner.company_name || `${r.partner.first_name} ${r.partner.last_name}`
					: 'Unknown Partner';

				const stockUnits = r.stock_units || [];
				const firstProduct = stockUnits[0]?.product;
				const productName = firstProduct?.name || 'Unknown Product';
				const totalQty = Number(stockUnits.reduce(
					(sum: number, unit) => sum + (Number(unit.size_quantity) || 0),
					0
				).toFixed(2));
				const unit = firstProduct?.measuring_unit || 'm';

				return {
					id: r.id,
					type: 'receipt',
					productName,
					partnerName,
					date: r.receipt_date,
					quantity: totalQty,
					unit,
					billNumber: r.receipt_number,
				};
			});

			// Combine and sort by date
			const allItems = [...dispatchItems, ...receiptItems].sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);

			// Group by month
			const groups: { [key: string]: MonthGroup } = {};

			allItems.forEach((item) => {
				const date = new Date(item.date);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				const monthName = date.toLocaleString('en-US', { month: 'long' });
				const year = date.getFullYear();

				if (!groups[monthKey]) {
					groups[monthKey] = {
						month: monthName,
						monthYear: `${monthName} ${year}`,
						inCount: 0,
						outCount: 0,
						items: [],
					};
				}

				groups[monthKey].items.push(item);

				if (item.type === 'receipt') {
					groups[monthKey].inCount += item.quantity;
				} else {
					groups[monthKey].outCount += item.quantity;
				}
			});

			const sortedGroups = Object.values(groups).map(group => ({
				...group,
				inCount: Number(group.inCount.toFixed(2)),
				outCount: Number(group.outCount.toFixed(2)),
			})).sort((a, b) => {
				const [yearA, monthA] = a.monthYear.split(' ');
				const [yearB, monthB] = b.monthYear.split(' ');
				const dateA = new Date(`${monthA} 1, ${yearA}`);
				const dateB = new Date(`${monthB} 1, ${yearB}`);
				return dateB.getTime() - dateA.getTime();
			});

			setMonthGroups(sortedGroups);

			// Calculate totals for past month
			const oneMonthAgo = new Date();
			oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

			const received = Number(receiptItems
				.filter((item) => new Date(item.date) >= oneMonthAgo)
				.reduce((sum, item) => sum + item.quantity, 0)
				.toFixed(2));

			const dispatched = Number(dispatchItems
				.filter((item) => new Date(item.date) >= oneMonthAgo)
				.reduce((sum, item) => sum + item.quantity, 0)
				.toFixed(2));

			setTotalReceived(received);
			setTotalDispatched(dispatched);
		} catch (err) {
			console.error('Error fetching stock flow:', err);
			setError(err instanceof Error ? err.message : 'Failed to load stock flow');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStockFlow();
	}, []);

	const filteredGroups = monthGroups.map((group) => ({
		...group,
		items: group.items.filter((item) => {
			const matchesSearch =
				item.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.productName.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesFilter =
				selectedFilter === 'all' ||
				(selectedFilter === 'dispatch' && item.type === 'dispatch') ||
				(selectedFilter === 'receipt' && item.type === 'receipt');

			return matchesSearch && matchesFilter;
		}),
	})).filter((group) => group.items.length > 0);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const day = date.getDate();
		const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
		const month = date.toLocaleString('en-US', { month: 'long' });
		return `${day}${suffix} ${month}`;
	};

	// Loading state
	if (loading) {
		return (
			<div className="relative flex flex-col min-h-screen pb-16">
				<div className="flex items-center justify-center h-screen">
					<div className="flex flex-col items-center gap-3">
						<div className="size-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
						<p className="text-sm text-gray-600">Loading stock flow...</p>
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
						<h2 className="text-lg font-semibold text-gray-900">Failed to load stock flow</h2>
						<p className="text-sm text-gray-600">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-screen pb-16">
			{/* Header */}
			<div className="flex items-end justify-between gap-4 p-4">
				<div className="flex-1 flex flex-col gap-2">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold text-gray-900">Stock flow</h1>
						<p className="text-sm text-gray-500">
							<span className="text-teal-700">{totalReceived} received</span>
							<span> & </span>
							<span className="text-yellow-700">{totalDispatched} dispatched</span>
							<span> in past month</span>
						</p>
					</div>

					{/* Search */}
					<div className="relative max-w-md">
						<Input
							type="text"
							placeholder="Search by bill number"
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
						src="/mascot/stock-flow-diary.png"
						alt="Stock flow"
						fill
						className="object-contain"
					/>
				</div>
			</div>

			{/* Filters */}
			<div className="flex gap-4 px-4 py-3">
				{/* Tab Pills */}
				<TabPills
					options={[
						{ value: 'all', label: 'All' },
						{ value: 'dispatch', label: 'Dispatch' },
						{ value: 'receipt', label: 'Receive' },
					]}
					value={selectedFilter}
					onValueChange={(value) => setSelectedFilter(value as 'all' | 'dispatch' | 'receipt')}
				/>

				{/* Partner Filter */}
				<Select value={selectedPartner} onValueChange={setSelectedPartner}>
					<SelectTrigger className="flex-1 max-w-3xs">
						<SelectValue placeholder="All partners" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All partners</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Stock Flow List */}
			<div className="flex flex-col">
				{filteredGroups.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-600 mb-2">No transactions found</p>
						<p className="text-sm text-gray-500">
							{searchQuery ? 'Try adjusting your search' : 'Start by adding a dispatch or receipt'}
						</p>
					</div>
				) : (
					filteredGroups.map((group, groupIndex) => (
						<div key={group.monthYear} className="flex flex-col">
							{/* Month Header */}
							<div
								className={`flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 ${groupIndex % 2 === 0 ? 'bg-green-100' : 'bg-orange-100'
									}`}
							>
								<p className="text-xs font-semibold text-gray-700">{group.month}</p>
								<p className="text-sm font-bold">
									<span className="text-teal-700">{group.inCount} </span>
									<span className="text-teal-700 font-normal">In</span>
									<span>, </span>
									<span className="text-yellow-700">{group.outCount} </span>
									<span className="text-yellow-700 font-normal">Out</span>
								</p>
							</div>

							{/* Transaction Items */}
							{group.items.map((item) => (
								<button
									key={item.id}
									className="flex items-center gap-4 px-4 py-3 border-t border-dashed border-gray-300 hover:bg-gray-50 transition-colors"
								>
									<div className="flex-1 flex flex-col items-start">
										<p className="text-base font-medium text-gray-900">{item.productName}</p>
										<p className="text-xs text-gray-500">{item.partnerName}</p>
										<p className="text-xs text-gray-500">
											Goods {item.type === 'dispatch' ? 'dispatched' : 'received'} on{' '}
											{formatDate(item.date)}
										</p>
									</div>
									<div className="flex flex-col items-end justify-center">
										<p
											className={`text-base font-bold ${item.type === 'receipt' ? 'text-teal-700' : 'text-yellow-700'
												}`}
										>
											{item.quantity} {item.unit}
										</p>
										<p className="text-xs text-gray-500">
											{item.type === 'receipt' ? 'In' : 'Out'}
										</p>
									</div>
								</button>
							))}
						</div>
					))
				)}
			</div>

			{/* Floating Action Button */}
			<Fab className="fixed bottom-20 right-4" />
		</div>
	);
}
