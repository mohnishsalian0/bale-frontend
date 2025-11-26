'use client';

import { IconMinus, IconPlus, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Tables } from '@/types/database/supabase';
import type { StockUnitSpec } from './ProductSelectionStep';

interface AllSpecificationsSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product: Tables<'products'> | null;
	units: StockUnitSpec[];
	onIncrementUnit: (unitId: string) => void;
	onDecrementUnit: (unitId: string) => void;
	onUpdateUnitCount: (unitId: string, count: number) => void;
	onDeleteUnit: (unitId: string) => void;
	onAddNewUnit: () => void;
}

export function AllSpecificationsSheet({
	open,
	onOpenChange,
	product,
	units,
	onIncrementUnit,
	onDecrementUnit,
	onUpdateUnitCount,
	onDeleteUnit,
	onAddNewUnit,
}: AllSpecificationsSheetProps) {
	const isMobile = useIsMobile();

	if (!product) return null;

	const handleCancel = () => {
		onOpenChange(false);
	};

	const handleAddNewUnit = () => {
		onAddNewUnit();
	};

	// Format date as DD/MM/YY
	const formatDate = (date: Date): string => {
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = String(date.getFullYear()).slice(-2);
		return `${day}/${month}/${year}`;
	};

	const today = formatDate(new Date());

	const formContent = (
		<div className="flex flex-col gap-0 my-4 border-t border-gray-200">
			{units.length === 0 ? (
				<div className="flex items-center justify-center py-12 text-center">
					<p className="text-sm text-gray-500">No units added yet</p>
				</div>
			) : (
				units.map((unit) => {
					// Build details line
					const details: string[] = [today];
					if (unit.supplier_number) details.push(`#${unit.supplier_number}`);
					details.push(unit.grade);
					if (unit.location) details.push(unit.location);

					return (
						<div
							key={unit.id}
							className="flex items-center gap-3 px-4 py-3 border-b border-gray-200"
						>
							{/* Unit Info */}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-700 mb-0.5">
									{product.name} {unit.quantity} {product.measuring_unit}
								</p>
								<p className="text-xs text-gray-500">
									{details.join(' • ')}
								</p>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-2 shrink-0">
								{/* Decrement/Delete */}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => unit.count === 1 ? onDeleteUnit(unit.id) : onDecrementUnit(unit.id)}
									className={unit.count === 1 ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : ''}
								>
									{unit.count === 1 ? <IconTrash /> : <IconMinus />}
								</Button>

								{/* Count */}
								<Input
									type="number"
									value={unit.count}
									onChange={(e) => onUpdateUnitCount(unit.id, Math.max(1, parseInt(e.target.value) || 1))}
									className="text-center h-9 w-16"
									min="1"
								/>

								{/* Increment */}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => onIncrementUnit(unit.id)}
								>
									<IconPlus />
								</Button>
							</div>
						</div>
					);
				})
			)}
		</div>
	);

	const footerButtons = (
		<div className="flex gap-3 w-full">
			<Button
				type="button"
				variant="outline"
				onClick={handleCancel}
				className="flex-1"
			>
				Cancel
			</Button>
			<Button
				type="button"
				onClick={handleAddNewUnit}
				className="flex-1"
			>
				<IconPlus />
				Add new {product.stock_type}
			</Button>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent className='px-0'>
					<DrawerHeader>
						<DrawerTitle>All stock units</DrawerTitle>
					</DrawerHeader>
					{formContent}
					<DrawerFooter>
						{footerButtons}
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md px-0">
				<DialogHeader className='px-4'>
					<DialogTitle>All stock units</DialogTitle>
				</DialogHeader>
				{formContent}
				<DialogFooter className='px-4'>
					{footerButtons}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
