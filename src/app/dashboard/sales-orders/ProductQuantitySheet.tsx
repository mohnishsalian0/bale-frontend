'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import type { Tables } from '@/types/database/supabase';

interface ProductQuantitySheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product: Tables<'products'> | null;
	initialQuantity?: number;
	onConfirm: (quantity: number) => void;
}

export function ProductQuantitySheet({
	open,
	onOpenChange,
	product,
	initialQuantity = 0,
	onConfirm,
}: ProductQuantitySheetProps) {
	const [quantity, setQuantity] = useState(initialQuantity);
	const isMobile = useMediaQuery('(max-width: 768px)');

	useEffect(() => {
		if (open) {
			setQuantity(initialQuantity || 1);
		}
	}, [open, initialQuantity]);

	const handleConfirm = () => {
		if (quantity > 0) {
			onConfirm(quantity);
			onOpenChange(false);
		}
	};

	const handleIncrement = () => {
		setQuantity(prev => prev + 1);
	};

	const handleDecrement = () => {
		setQuantity(prev => Math.max(0, prev - 1));
	};

	if (!product) return null;

	const FormContent = () => (
		<div className="flex flex-col gap-6 py-4">
			{/* Product Info */}
			<div className="flex items-center gap-3">
				<div className="relative size-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
					{product.product_images?.[0] ? (
						<Image
							src={product.product_images[0]}
							alt={product.name}
							fill
							className="object-cover"
						/>
					) : (
						<div className="size-full flex items-center justify-center text-neutral-400">
							<IconPlus className="size-8" />
						</div>
					)}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-base font-medium text-gray-700 truncate">{product.name}</p>
					<p className="text-xs text-neutral-500 truncate">
						{[product.material, product.color].filter(Boolean).join(', ')}
					</p>
				</div>
			</div>

			{/* Quantity Input */}
			<div className="flex flex-col gap-3">
				<label className="text-sm font-medium text-gray-700">Quantity</label>
				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleDecrement}
						className="size-10 shrink-0"
					>
						<IconMinus className="size-4" />
					</Button>
					<div className="relative flex-1">
						<Input
							type="number"
							value={quantity}
							onChange={e => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
							className="text-center text-lg font-medium"
							min="0"
							step="0.01"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
							{product.measuring_unit}
						</span>
					</div>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleIncrement}
						className="size-10 shrink-0"
					>
						<IconPlus className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);

	const FooterButtons = () => (
		<div className="flex gap-3 w-full">
			<Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
				Cancel
			</Button>
			<Button onClick={handleConfirm} disabled={quantity <= 0} className="flex-1">
				Confirm
			</Button>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Add quantity</DrawerTitle>
					</DrawerHeader>
					<FormContent />
					<DrawerFooter>
						<FooterButtons />
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add quantity</DialogTitle>
				</DialogHeader>
				<FormContent />
				<DialogFooter>
					<FooterButtons />
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
