'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IconBolt, IconTrash } from '@tabler/icons-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectInventorySheet } from './SelectInventorySheet';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import { getUnitAbbreviation } from '@/lib/utils/units';

const SCAN_DELAY: number = 1200;

export interface ScannedStockUnit {
	stockUnit: Tables<'stock_units'>;
	product: Tables<'products'>;
	quantity: number; // User-entered quantity to dispatch
}

interface QRScannerStepProps {
	scannedUnits: ScannedStockUnit[];
	onScannedUnitsChange: (units: ScannedStockUnit[]) => void;
}

export function QRScannerStep({
	scannedUnits,
	onScannedUnitsChange,
}: QRScannerStepProps) {
	const [error, setError] = useState<string | null>(null);
	const [torch, setTorch] = useState(false);
	const [paused, setPaused] = useState(false);
	const [showInventorySheet, setShowInventorySheet] = useState(false);
	const supabase = createClient();

	const handleScan = async (detectedCodes: any[]) => {
		if (paused || detectedCodes.length === 0) return;

		// Pause scanning temporarily to process
		setPaused(true);

		const decodedText = detectedCodes[0].rawValue;

		// Check if already scanned
		const alreadyScanned = scannedUnits.some(
			unit => unit.stockUnit.id === decodedText
		);

		if (alreadyScanned) {
			setError('Stock unit already added');
			setTimeout(() => {
				setError(null);
				setPaused(false);
			}, SCAN_DELAY);
			return;
		}

		// Fetch stock unit from database by ID
		try {
			const { data: stockUnit, error: stockError } = await supabase
				.from('stock_units')
				.select('*')
				.eq('id', decodedText)
				.eq('status', 'in_stock')
				.single();

			if (stockError || !stockUnit) {
				setError('Stock unit no longer in inventory');
				setTimeout(() => {
					setError(null);
					setPaused(false);
				}, SCAN_DELAY);
				return;
			}

			// Fetch product details
			const { data: product, error: productError } = await supabase
				.from('products')
				.select('*')
				.eq('id', stockUnit.product_id)
				.single();

			if (productError || !product) {
				setError('Product not found');
				setTimeout(() => {
					setError(null);
					setPaused(false);
				}, SCAN_DELAY);
				return;
			}

			// Add to scanned units with full quantity
			onScannedUnitsChange([
				...scannedUnits,
				{
					stockUnit,
					product,
					quantity: stockUnit.remaining_quantity,
				}
			]);

			// Resume scanning after a brief delay
			setTimeout(() => setPaused(false), SCAN_DELAY);
		} catch (err) {
			console.error('Error fetching stock unit:', err);
			setError('Invalid QR code');
			setTimeout(() => {
				setError(null);
				setPaused(false);
			}, SCAN_DELAY);
		}
	};

	const handleError = (err: any) => {
		console.error('Scanner error:', err);
		if (err?.name === 'NotAllowedError') {
			setError('Camera permission denied');
		} else if (err?.name === 'NotFoundError') {
			setError('No camera found');
		}
	};

	const handleQuantityChange = (index: number, newQuantity: number) => {
		const unit = scannedUnits[index];
		const maxQuantity = unit.stockUnit.initial_quantity;

		// Validate: min 1, max total size
		const validQuantity = Math.max(1, Math.min(newQuantity, maxQuantity));
		console.log(newQuantity, validQuantity);

		const updatedUnits = [...scannedUnits];
		updatedUnits[index] = { ...unit, quantity: validQuantity };
		console.log(updatedUnits);
		onScannedUnitsChange(updatedUnits);
	};

	const handleRemoveUnit = (index: number) => {
		const updatedUnits = scannedUnits.filter((_, i) => i !== index);
		onScannedUnitsChange(updatedUnits);
	};

	const handleOpenInventory = () => {
		setShowInventorySheet(true);
	};

	const handleProductSelect = (product: Tables<'products'>) => {
		// TODO: Open stock units selection for this product
		console.log('Selected product:', product);
		setShowInventorySheet(false);
	};

	return (
		<div className="flex flex-col h-full">
			{/* Camera Section */}
			<div className="relative aspect-square w-full shrink-0 bg-gray-900 overflow-hidden">
				{/* QR Scanner */}
				<Scanner
					onScan={handleScan}
					onError={handleError}
					formats={['qr_code']}
					paused={paused}
					components={{
						torch: torch,
						finder: false,
					}}
					constraints={{
						facingMode: 'environment',
					}}
					styles={{
						container: {
							width: '100%',
							height: '100%',
						},
						video: {
							objectFit: 'cover',
						},
					}}
				>
					{/* Custom Finder */}
					<div className="absolute top-1/2 left-1/2 w-2/3 h-2/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
						<div
							className="w-full h-full border-2 border-white rounded-2xl"
							style={{
								boxShadow: '0 0 0 9999px color-mix(in srgb, var(--color-gray-900) 80%, transparent)',
							}}
						/>
					</div>
				</Scanner>

				{/* Title & Error Overlay */}
				{error ? (
					<div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/50 text-red-900 px-4 py-2 text-sm text-nowrap rounded-lg z-10">
						{error}
					</div>
				) : (
					<p className="absolute top-10 left-1/2 -translate-x-1/2 text-lg text-white text-center whitespace-pre z-10">
						Scan QR to add item
					</p>
				)}

				{/* Action Buttons */}
				<div className="flex gap-3 absolute bottom-10 left-1/2 -translate-x-1/2 text-center z-10">
					{/* Flashlight Button */}
					<Button
						type="button"
						// variant="outline"
						variant={`${torch ? 'default' : 'outline'}`}
						size="icon"
						onClick={() => setTorch(prev => !prev)}
						className={`${!torch ? 'border-gray-500 shadow-dark-gray-md hover:bg-gray-200 hover:text-gray-700' : ''}`}
					>
						<IconBolt className="rotate-[270deg]" />
					</Button>

					{/* Select from Inventory Button */}
					<Button
						type="button"
						variant="outline"
						onClick={handleOpenInventory}
						className="border-gray-500 shadow-dark-gray-md hover:bg-gray-200 hover:text-gray-700"
					>
						Select from inventory
					</Button>
				</div>
			</div>

			{/* Scanned Products List */}
			<div className="flex-1 overflow-y-auto">
				{scannedUnits.length === 0 ? (
					<div className="flex items-center justify-center py-12">
						<p className="text-sm text-gray-500">Scan QR codes to add items</p>
					</div>
				) : (
					<div className="flex flex-col">
						{scannedUnits.map((item, index) => {
							console.log(item);
							const imageUrl = item.product.product_images?.[0];
							const maxQuantity = item.stockUnit.initial_quantity;

							return (
								<div
									key={item.stockUnit.id}
									className="flex items-center gap-3 px-4 py-3 border-b border-gray-200"
								>
									{/* Product Image */}
									<div className="relative size-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
										{imageUrl ? (
											<Image
												src={imageUrl}
												alt={item.product.name}
												fill
												className="object-cover"
											/>
										) : (
											<div className="flex items-center justify-center size-full text-gray-400">
												<span className="text-xs">No img</span>
											</div>
										)}
									</div>

									{/* Product Info */}
									<div className="flex-1 min-w-0">
										<p className="text-base font-medium text-gray-900 truncate">
											{item.product.name}
										</p>
										<p className="text-xs text-gray-500 truncate">
											#{item.stockUnit.unit_number}
										</p>
									</div>

									{/* Quantity Input */}
									<div className="flex items-center gap-2 shrink-0">
										<div className="border border-gray-300 rounded-lg px-3 py-2 flex items-center gap-2 h-9 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow]">
											<Input
												type="number"
												value={item.quantity}
												onFocus={e => e.target.select()}
												onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 1)}
												className="border-0 p-0 h-auto text-sm font-semibold text-gray-700 focus-visible:ring-0 focus-visible:border-transparent"
												min="1"
												max={maxQuantity}
												step="0.01"
											/>
											<p className="text-sm text-gray-500 whitespace-nowrap">
												/ {maxQuantity} {getUnitAbbreviation(item.product.measuring_unit)}
											</p>
										</div>

										{/* Delete Button */}
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => handleRemoveUnit(index)}
											className="text-gray-500 hover:text-red-600 hover:bg-red-50 size-9"
										>
											<IconTrash className="size-4" />
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Select Inventory Sheet */}
			{showInventorySheet && (
				<SelectInventorySheet
					open={showInventorySheet}
					onOpenChange={setShowInventorySheet}
					onProductSelect={handleProductSelect}
				/>
			)}
		</div>
	);
}
