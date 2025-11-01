'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { IconBolt, IconTrash } from '@tabler/icons-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import { getUnitAbbreviation } from '@/lib/utils/units';

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
	const [flashlightSupported, setFlashlightSupported] = useState(false);
	const [flashlightEnabled, setFlashlightEnabled] = useState(false);
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const hasCameraInitialized = useRef(false);
	const supabase = createClient();

	useEffect(() => {
		// Prevent double initialization in strict mode
		if (hasCameraInitialized.current) return;
		hasCameraInitialized.current = true;

		// Initialize scanner
		const scanner = new Html5Qrcode('qr-reader');
		scannerRef.current = scanner;

		// Check if flashlight is supported
		checkFlashlightSupport();

		// Start scanning
		startScanning();

		return () => {
			// Cleanup scanner on unmount
			void stopScanning();
		};
	}, []);

	const startScanning = async () => {
		if (!scannerRef.current) return;

		try {
			setError(null);

			await scannerRef.current.start(
				{ facingMode: 'environment' },
				{
					fps: 10,
					qrbox: 250,
					aspectRatio: 1.0,
				},
				handleScanSuccess,
				handleScanError
			);

			// Clear any previous errors on successful start
			setError(null);
		} catch (err) {
			console.error('Error starting scanner:', err);
			const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';

			// Only show error if it's a real issue (not permission-related temporary issue)
			if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission')) {
				setError('Camera permission denied');
			} else if (errorMessage.includes('NotFoundError')) {
				setError('No camera found');
			} else {
				setError('Failed to start camera');
			}
		}
	};

	const pauseScanning = async () => {
		if (scannerRef.current) {
			scannerRef.current.pause();
		}
	};

	const resumeScanning = async () => {
		if (scannerRef.current) {
			scannerRef.current.resume();
		}
	};

	const stopScanning = async () => {
		if (scannerRef.current) {
			await scannerRef.current.stop();
			scannerRef.current.clear();
			scannerRef.current = null;
			hasCameraInitialized.current = false;
		}
	};

	const checkFlashlightSupport = async () => {
		try {
			const devices = await Html5Qrcode.getCameras();
			if (devices && devices.length > 0) {
				// Flashlight support varies by device, we'll try to enable it
				const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
				const track = stream.getVideoTracks()[0];
				const capabilities = track.getCapabilities() as any;
				setFlashlightSupported('torch' in capabilities);
				stream.getTracks().forEach(track => track.stop());
			}
		} catch (err) {
			console.error('Error checking flashlight support:', err);
		}
	};

	const toggleFlashlight = async () => {
		if (!flashlightSupported) return;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
			const track = stream.getVideoTracks()[0];
			await track.applyConstraints({
				advanced: [{ torch: !flashlightEnabled } as any]
			});
			setFlashlightEnabled(!flashlightEnabled);
		} catch (err) {
			console.error('Error toggling flashlight:', err);
		}
	};

	const handleScanSuccess = async (decodedText: string) => {
		// Pause scanning temporarily to process
		await pauseScanning();

		// Check if already scanned
		const alreadyScanned = scannedUnits.some(
			unit => unit.stockUnit.id === decodedText
		);

		if (alreadyScanned) {
			setError('Stock unit already added');
			setTimeout(() => setError(null), 3000);
			setTimeout(resumeScanning, 1000);
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
				setTimeout(() => setError(null), 3000);
				setTimeout(resumeScanning, 1000);
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
				setTimeout(() => setError(null), 3000);
				setTimeout(resumeScanning, 1000);
				return;
			}

			// Add to scanned units with full quantity
			onScannedUnitsChange([
				...scannedUnits,
				{
					stockUnit,
					product,
					quantity: stockUnit.initial_quantity,
				}
			]);

			// Resume scanning
			setTimeout(resumeScanning, 1000);
		} catch (err) {
			console.error('Error fetching stock unit:', err);
			setError('Invalid qr code');
			setTimeout(() => setError(null), 3000);
			setTimeout(resumeScanning, 1000);
		}
	};

	const handleScanError = (_err: string) => {
		// Silently ignore all scan errors - they happen constantly when no QR is detected
		// This is normal behavior for the scanner
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
		// TODO: Open inventory selection sheet
		console.log('Open inventory selection');
	};

	return (
		<div className="flex flex-col h-full">
			{/* Camera Section */}
			<div className="relative aspect-square w-full shrink-0 bg-gray-900 overflow-hidden">
				{/* QR Reader Container */}
				<div id="qr-reader" className="absolute inset-0" />
				<style jsx global>{`
					#qr-reader {
						width: 100% !important;
						height: 100% !important;
					}
					#qr-reader > div,
					#qr-reader video {
						width: 100% !important;
						height: 100% !important;
						object-fit: cover !important;
					}
					#qr-reader__dashboard_section {
						display: none !important;
					}
					#qr-reader__dashboard_section_csr {
						display: none !important;
					}
				`}</style>

				{/* Title Overlay */}
				<p className="absolute top-10 left-1/2 -translate-x-1/2 text-lg text-white text-center whitespace-pre z-10">
					Scan QR to add item
				</p>

				{/* Error Message */}
				{error && (
					<div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100/50 text-red-900 px-4 py-2 rounded-lg text-sm z-10">
						{error}
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex gap-3 absolute bottom-10 left-1/2 -translate-x-1/2 text-center z-10">
					{/* Flashlight Button */}
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={toggleFlashlight}
						disabled={!flashlightSupported}
						className="border-gray-500 shadow-dark-gray-md hover:bg-gray-200 hover:text-gray-700"
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
		</div>
	);
}
