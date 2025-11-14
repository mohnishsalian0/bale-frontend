'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconMinus, IconPlus, IconChevronDown, IconRubberStamp, IconTruckLoading, IconHash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DatePicker } from '@/components/ui/date-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Tables } from '@/types/database/supabase';
import type { MeasuringUnit } from '@/types/database/enums';
import type { StockUnitSpec } from './ProductSelectionStep';
import { Input } from '@/components/ui/input';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';

interface StockUnitEntrySheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product: Tables<'products'> | null;
	initialUnit?: Partial<StockUnitSpec>;
	onConfirm: (unit: Omit<StockUnitSpec, 'id'>) => void;
}

export function StockUnitEntrySheet({
	open,
	onOpenChange,
	product,
	initialUnit,
	onConfirm,
}: StockUnitEntrySheetProps) {
	const [quantity, setQuantity] = useState(0);
	const [manufacturedOn, setManufacturedOn] = useState<Date | undefined>(undefined);
	const [quality, setQuality] = useState('');
	const [supplierNumber, setSupplierNumber] = useState('');
	const [location, setLocation] = useState('');
	const [notes, setNotes] = useState('');
	const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
	const isMobile = useIsMobile();

	useEffect(() => {
		if (open) {
			setQuantity(initialUnit?.quantity || 0);
			setManufacturedOn(undefined);
			setQuality(initialUnit?.grade || '');
			setSupplierNumber(initialUnit?.supplier_number || '');
			setLocation(initialUnit?.location || '');
			setNotes(initialUnit?.notes || '');
			setShowAdditionalDetails(false);
		}
	}, [open, initialUnit]);

	const handleCancel = (e: React.MouseEvent) => {
		// e.preventDefault();
		// e.stopPropagation();
		onOpenChange(false);
	};

	const handleConfirm = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (quantity > 0) {
			onConfirm({
				quantity,
				grade: quality,
				supplier_number: supplierNumber || undefined,
				location: location || undefined,
				notes: notes || undefined,
				count: initialUnit?.count || 1,
			});
			onOpenChange(false);
		}
	};

	const handleIncrement = () => {
		setQuantity(prev => prev + 1);
	};

	const handleDecrement = () => {
		setQuantity(prev => Math.max(0, prev - 1));
	};

	const handlePresetAdd = (amount: number) => {
		setQuantity(prev => prev + amount);
	};

	const presetAmounts = [5, 10, 25, 50, 100, 250];

	if (!product) return null;

	const unitAbbreviation = getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit | null);

	const productInfo = [product.material, product.color_name].filter(Boolean).join(', ');

	const formContent = (
		<div className="flex flex-col gap-8 p-4 md:px-0 overflow-x-hidden">
			<div className="flex flex-col gap-4">
				<div className="flex gap-4">
					{/* Product Info */}
					<div className="flex items-center gap-3 flex-1 min-w-0">
						<div className="relative size-12 rounded-lg overflow-hidden bg-gray-100">
							{product.product_images?.[0] ? (
								<Image
									src={product.product_images[0]}
									alt={product.name}
									fill
									className="object-cover"
								/>
							) : (
								<div className="size-full flex items-center justify-center text-gray-400">
									<IconPlus className="size-8" />
								</div>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<p title={product.name} className="text-base font-medium text-gray-700 truncate">{product.name}</p>
							<p title={productInfo} className="text-xs text-gray-500 truncate">
								{[product.material, product.color_name].filter(Boolean).join(', ')}
							</p>
						</div>
					</div>

					{/* Quantity Input */}
					<div className="flex items-center gap-1 shrink-0">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={handleDecrement}
						>
							<IconMinus />
						</Button>
						<div className="relative">
							<Input
								type="number"
								value={quantity}
								onChange={e => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
								className="text-center text-lg font-medium max-w-25 pr-10"
								min="0"
								step="0.01"
							/>
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
								{unitAbbreviation}
							</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={handleIncrement}
						>
							<IconPlus />
						</Button>
					</div>
				</div>

				{/* Preset size options */}
				<div className="flex flex-wrap items-center gap-2">
					{presetAmounts.map(amount => (
						<Button
							key={amount}
							type="button"
							variant="outline"
							size="sm"
							className='border-border shadow-gray-sm'
							onClick={() => handlePresetAdd(amount)}
						>
							<IconPlus />
							{amount}
						</Button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<div className="flex gap-4">
					{/* Supplier Number - Input with Icon */}
					<InputWithIcon
						type="text"
						placeholder="Supplier number"
						value={supplierNumber}
						className="flex-1"
						onChange={e => setSupplierNumber(e.target.value)}
						icon={<IconHash />}
					/>

					{/* Manufactured On - DatePicker */}
					<DatePicker
						placeholder="Manufactured on"
						value={manufacturedOn}
						className="flex-1"
						onChange={(date) => setManufacturedOn(date)}
					/>
				</div>

				<div className="flex gap-4">
					{/* Quality - Input with Icon */}
					<InputWithIcon
						type="text"
						placeholder="Quality"
						value={quality}
						className="flex-1"
						onChange={e => setQuality(e.target.value)}
						icon={<IconRubberStamp />}
					/>

					{/* Location - Input with Icon */}
					<InputWithIcon
						type="text"
						placeholder="Location"
						value={location}
						className="flex-1"
						onChange={e => setLocation(e.target.value)}
						icon={<IconTruckLoading />}
					/>
				</div>
			</div>

			{/* Additional Details */}
			<Collapsible
				open={showAdditionalDetails}
				onOpenChange={setShowAdditionalDetails}
			>
				<CollapsibleTrigger className={`flex items-center justify-between w-full ${showAdditionalDetails ? 'pb-3' : 'pb-0'}`}>
					<h3 className="font-medium text-gray-900">Additional Details</h3>
					<IconChevronDown
						className={`size-5 text-gray-500 transition-transform ${showAdditionalDetails ? 'rotate-180' : 'rotate-0'}`}
					/>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<Textarea
						placeholder="Enter a note..."
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="min-h-32"
					/>
				</CollapsibleContent>
			</Collapsible>
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
				onClick={handleConfirm}
				disabled={quantity <= 0}
				className="flex-1"
			>
				Add
			</Button>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Stock unit</DrawerTitle>
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
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Stock unit</DialogTitle>
				</DialogHeader>
				{formContent}
				<DialogFooter>
					{footerButtons}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
