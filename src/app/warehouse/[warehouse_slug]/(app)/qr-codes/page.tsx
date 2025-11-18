'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { IconQrcode, IconShare, IconDownload } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fab } from '@/components/ui/fab';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { formatCreatedAt, formatAbsoluteDate } from '@/lib/utils/date';
import { toast } from 'sonner';
import { LoadingState } from '@/components/layouts/loading-state';
import { useSession } from '@/contexts/session-context';

interface QRBatch {
	id: string;
	batchName: string;
	imageUrl: string | null;
	pdfUrl: string | null;
	itemCount: number;
	createdAt: string;
}

interface Product {
	id: string;
	name: string;
}

export default function QRCodesPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const [batches, setBatches] = useState<QRBatch[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [selectedProduct, setSelectedProduct] = useState<string>('all');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const supabase = createClient();

	const fetchProducts = async () => {
		try {
			const { data, error: fetchError } = await supabase
				.from('products')
				.select('id, name')
				.order('name', { ascending: true });

			if (fetchError) throw fetchError;

			setProducts(data || []);
		} catch (err) {
			console.error('Error fetching products:', err);
		}
	};

	const fetchBatches = async () => {
		try {
			setLoading(true);
			setError(null);

			// Base query
			let query = supabase
				.from('qr_batches')
				.select(`
					id,
					batch_name,
					image_url,
					pdf_url,
					created_at,
					qr_batch_items (
						id,
						stock_unit_id
					)
				`)
				.eq('warehouse_id', warehouse.id)
				.order('created_at', { ascending: false });

			const { data, error: fetchError } = await query;

			if (fetchError) throw fetchError;

			// Transform data
			let transformedBatches: QRBatch[] = (data || []).map((batch: any) => ({
				id: batch.id,
				batchName: batch.batch_name,
				imageUrl: batch.image_url,
				pdfUrl: batch.pdf_url,
				itemCount: batch.qr_batch_items?.length || 0,
				createdAt: batch.created_at,
			}));

			// Filter by product if selected
			if (selectedProduct !== 'all') {
				const { data: batchItemsData } = await supabase
					.from('qr_batch_items')
					.select(`
						batch_id,
						stock_units (
							product_id
						)
					`)
					.eq('stock_units.product_id', selectedProduct);

				const batchIds = new Set(batchItemsData?.map((item: any) => item.batch_id) || []);
				transformedBatches = transformedBatches.filter(batch => batchIds.has(batch.id));
			}

			setBatches(transformedBatches);
		} catch (err) {
			console.error('Error fetching batches:', err);
			setError(err instanceof Error ? err.message : 'Failed to load QR batches');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProducts();
		fetchBatches();
	}, [selectedProduct]);

	const handleShare = async (batch: QRBatch) => {
		if (!batch.pdfUrl) {
			toast.error('No PDF available to share');
			return;
		}

		// Check if running on mobile with share API support
		if (navigator.share) {
			try {
				await navigator.share({
					title: batch.batchName,
					text: `QR Code Batch: ${batch.batchName}`,
					url: batch.pdfUrl,
				});
			} catch (err) {
				// User cancelled or error occurred
				console.log('Share cancelled or failed:', err);
			}
		} else {
			// Desktop: Copy link to clipboard
			try {
				await navigator.clipboard.writeText(batch.pdfUrl);
				toast.success('Link copied to clipboard!');
			} catch (err) {
				toast.error('Failed to copy link');
			}
		}
	};

	const handleDownload = (batch: QRBatch) => {
		if (!batch.pdfUrl) {
			toast.error('No PDF available to download');
			return;
		}

		// Trigger download
		const link = document.createElement('a');
		link.href = batch.pdfUrl;
		link.download = `${batch.batchName}.pdf`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		toast.success('Download started');
	};

	// Loading state
	if (loading) {
		return <LoadingState message="Loading QR batches..." />;
	}

	// Error state
	if (error) {
		return (
			<div className="relative flex flex-col min-h-dvh pb-16">
				<div className="flex items-center justify-center h-screen p-4">
					<div className="flex flex-col items-center gap-3 text-center max-w-md">
						<div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
							<span className="text-2xl">⚠️</span>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Failed to load QR batches</h2>
						<p className="text-sm text-gray-600">{error}</p>
						<Button onClick={() => window.location.reload()} variant="outline" size="sm">
							Try again
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-dvh pb-16">
			{/* Header */}
			<div className="flex items-end justify-between gap-4 p-4">
				<div className="flex-1">
					<h1 className="text-3xl font-bold text-gray-900">QR codes</h1>
				</div>

				{/* Mascot */}
				<div className="relative size-25 shrink-0">
					<Image
						src="/illustrations/qr-scanner.png"
						alt="QR Scanner"
						fill
						className="object-contain"
					/>
				</div>
			</div>

			{/* Filters */}
			<div className="flex gap-3 px-4 py-2 overflow-x-auto shrink-0">
				<Select value={selectedProduct} onValueChange={setSelectedProduct}>
					<SelectTrigger className="w-[140px] h-10 shrink-0">
						<SelectValue placeholder="Product" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All products</SelectItem>
						{products.map((product) => (
							<SelectItem key={product.id} value={product.id}>
								{product.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Batch List */}
			<div className="flex flex-col gap-0">
				{batches.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-600 mb-2">No QR batches found</p>
						<p className="text-sm text-gray-500">
							{selectedProduct !== 'all'
								? 'Try selecting a different product'
								: 'Create your first QR batch'}
						</p>
					</div>
				) : (
					batches.map((batch) => (
						<Card
							key={batch.id}
							className="rounded-none border-0 border-b border-gray-200 shadow-none bg-transparent"
						>
							<CardContent className="p-4 flex gap-4 items-center">
								{/* Batch Image / QR Icon */}
								<div className="relative size-16 rounded-lg shrink-0 bg-gray-200 overflow-hidden flex items-center justify-center">
									{batch.imageUrl ? (
										<Image
											src={batch.imageUrl}
											alt={batch.batchName}
											fill
											className="object-cover"
										/>
									) : (
										<IconQrcode className="size-8 text-gray-400" />
									)}
								</div>

								{/* Batch Info */}
								<div className="flex-1 flex flex-col items-start">
									<p className="text-base font-medium text-gray-900">{batch.batchName}</p>
									<p className="text-xs text-gray-500">
										{batch.itemCount} {batch.itemCount === 1 ? 'code' : 'codes'}
									</p>
									<p
										className="text-xs text-gray-500"
										title={formatAbsoluteDate(batch.createdAt)}
									>
										{formatCreatedAt(batch.createdAt)}
									</p>
								</div>

								{/* Action Buttons */}
								<div className="flex gap-2">
									{/* Share Button */}
									<Button
										variant="outline"
										onClick={() => handleShare(batch)}
									>
										<IconShare className="size-5" />
										<span className="hidden md:inline">Share</span>
									</Button>

									{/* Download Button */}
									<Button
										variant="outline"
										onClick={() => handleDownload(batch)}
									>
										<IconDownload className="size-5" />
										<span className="hidden md:inline">Download</span>
									</Button>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>

			{/* Floating Action Button */}
			<Fab
				onClick={() => router.push(`/warehouse/${warehouse.slug}/qr-codes/create`)}
				className="fixed bottom-20 right-4"
			/>
		</div>
	);
}
