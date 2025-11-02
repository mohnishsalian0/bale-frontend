'use client';

import { useState, useEffect } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeDate } from '@/lib/utils/date';
import type { Tables } from '@/types/database/supabase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface StockUnit extends Tables<'stock_units'> {
	product?: Tables<'products'>;
}

interface GoodsInward extends Tables<'goods_inwards'> {
	stock_units: StockUnit[];
}

interface QRStockUnitSelectionStepProps {
	productId: string;
	selectedStockUnitIds: string[];
	onSelectionChange: (stockUnitIds: string[]) => void;
}

export function QRStockUnitSelectionStep({
	productId,
	selectedStockUnitIds,
	onSelectionChange,
}: QRStockUnitSelectionStepProps) {
	const [loading, setLoading] = useState(true);
	const [goodsInwards, setGoodsInwards] = useState<GoodsInward[]>([]);
	const [expandedInwards, setExpandedInwards] = useState<Set<string>>(new Set());
	const supabase = createClient();

	useEffect(() => {
		fetchStockUnits();
	}, [productId]);

	const fetchStockUnits = async () => {
		setLoading(true);
		try {
			// Fetch all stock units for this product, grouped by goods inward
			const { data: stockUnits, error } = await supabase
				.from('stock_units')
				.select(`
					*,
					product:products(*)
				`)
				.eq('product_id', productId)
				.eq('status', 'in_stock')
				.order('created_at', { ascending: false });

			if (error) throw error;

			// Group stock units by goods inward
			const inwardMap = new Map<string | null, StockUnit[]>();
			(stockUnits || []).forEach(unit => {
				const inwardId = unit.created_from_inward_id;
				if (!inwardMap.has(inwardId)) {
					inwardMap.set(inwardId, []);
				}
				inwardMap.get(inwardId)!.push(unit);
			});

			// Fetch goods inward details
			const inwardIds = Array.from(inwardMap.keys()).filter(id => id !== null) as string[];
			const { data: inwardsData, error: inwardsError } = await supabase
				.from('goods_inwards')
				.select('*')
				.in('id', inwardIds);

			if (inwardsError) throw inwardsError;

			// Combine goods inwards with their stock units
			const groupedInwards: GoodsInward[] = (inwardsData || []).map(inward => ({
				...inward,
				stock_units: inwardMap.get(inward.id) || [],
			}));

			// Handle units without goods inward (if any)
			const orphanedUnits = inwardMap.get(null) || [];
			if (orphanedUnits.length > 0) {
				groupedInwards.push({
					id: 'orphaned',
					inward_number: 'No Goods Inward',
					stock_units: orphanedUnits,
				} as GoodsInward);
			}

			setGoodsInwards(groupedInwards);

			// Auto-expand first inward
			if (groupedInwards.length > 0) {
				setExpandedInwards(new Set([groupedInwards[0].id]));
			}
		} catch (err) {
			console.error('Error fetching stock units:', err);
		} finally {
			setLoading(false);
		}
	};

	const toggleInward = (inwardId: string) => {
		setExpandedInwards(prev => {
			const next = new Set(prev);
			if (next.has(inwardId)) {
				next.delete(inwardId);
			} else {
				next.add(inwardId);
			}
			return next;
		});
	};

	const handleInwardCheckboxChange = (inward: GoodsInward, checked: boolean) => {
		const inwardUnitIds = inward.stock_units.map(u => u.id);
		if (checked) {
			// Add all units from this inward
			onSelectionChange([...new Set([...selectedStockUnitIds, ...inwardUnitIds])]);
		} else {
			// Remove all units from this inward
			onSelectionChange(selectedStockUnitIds.filter(id => !inwardUnitIds.includes(id)));
		}
	};

	const handleUnitCheckboxChange = (unitId: string, checked: boolean) => {
		if (checked) {
			onSelectionChange([...selectedStockUnitIds, unitId]);
		} else {
			onSelectionChange(selectedStockUnitIds.filter(id => id !== unitId));
		}
	};

	const getInwardSelectionState = (inward: GoodsInward): 'all' | 'some' | 'none' => {
		const inwardUnitIds = inward.stock_units.map(u => u.id);
		const selectedCount = inwardUnitIds.filter(id => selectedStockUnitIds.includes(id)).length;
		if (selectedCount === 0) return 'none';
		if (selectedCount === inwardUnitIds.length) return 'all';
		return 'some';
	};

	const getQRStatus = (unit: StockUnit): string => {
		if (unit.barcode_generated_at) {
			return `QR made ${formatRelativeDate(unit.barcode_generated_at)}`;
		}
		return 'QR pending';
	};

	const totalSelected = selectedStockUnitIds.length;

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-sm text-gray-500">Loading stock units...</p>
			</div>
		);
	}

	if (goodsInwards.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-sm text-gray-500">No stock units available for this product</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="px-4 py-4 shrink-0 border-b border-gray-200">
				<h3 className="text-lg font-semibold text-gray-900">Select stock units</h3>
				<p className="text-sm text-gray-500">
					{totalSelected} {totalSelected === 1 ? 'unit' : 'units'} selected
				</p>
			</div>

			{/* Goods Inward List - Scrollable */}
			<div className="flex-1 overflow-y-auto">
				{goodsInwards.map(inward => {
					const isExpanded = expandedInwards.has(inward.id);
					const selectionState = getInwardSelectionState(inward);
					const selectedInwardCount = inward.stock_units.filter(u =>
						selectedStockUnitIds.includes(u.id)
					).length;

					return (
						<Collapsible
							key={inward.id}
							open={isExpanded}
							onOpenChange={() => toggleInward(inward.id)}
							className="border-t border-gray-200 px-4 py-2"
						>
							<CollapsibleTrigger className={`flex items-center gap-3 w-full`}>
								<Checkbox
									checked={selectionState === 'all'}
									onCheckedChange={(checked) => handleInwardCheckboxChange(inward, checked === true)}
									className={selectionState === 'some' ? 'data-[state=checked]:bg-gray-400' : ''}
								/>
								<span className="flex-1 text-xs font-medium text-gray-900 text-start">
									{inward.inward_number} ({selectedInwardCount}/{inward.stock_units.length} selected)
								</span>
								<IconChevronDown
									className={`size-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
								/>
							</CollapsibleTrigger>

							<CollapsibleContent key={inward.id}>
								{/* Stock Units List */}
								<div className="flex flex-col">
									{inward.stock_units.map(unit => (
										<div
											key={unit.id}
											className="flex items-center gap-3 py-3 border-t border-gray-100 hover:bg-gray-50"
										>
											<Checkbox
												checked={selectedStockUnitIds.includes(unit.id)}
												onCheckedChange={(checked) => handleUnitCheckboxChange(unit.id, checked === true)}
											/>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<p className="text-sm font-medium text-gray-900">{unit.unit_number}</p>
													<span className={`text-xs px-2 py-0.5 rounded-full ${unit.barcode_generated_at
														? 'bg-green-100 text-green-700'
														: 'bg-yellow-100 text-yellow-700'
														}`}>
														{getQRStatus(unit)}
													</span>
												</div>
												<div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
													{unit.manufacturing_date && (
														<span>Made on {new Date(unit.manufacturing_date).toLocaleDateString()}</span>
													)}
													<span>
														{unit.initial_quantity} {unit.product?.measuring_unit || 'units'}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</CollapsibleContent>
						</Collapsible>
					);
				})}
			</div>
		</div>
	);
}
