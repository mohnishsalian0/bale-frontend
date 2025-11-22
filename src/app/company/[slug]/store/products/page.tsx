'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter, notFound } from 'next/navigation';
import { IconShoppingCart, IconArrowRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/cart-context';
import { getCompanyBySlug, getPublicProducts } from '@/lib/queries/catalog';
import { ProductCard } from './ProductCard';
import { ProductQuantitySheet } from '../ProductQuantitySheet';
import { LoadingState } from '@/components/layouts/loading-state';
import type { PublicProduct } from '@/lib/queries/catalog';
import type { Tables } from '@/types/database/supabase';

type Company = Tables<'companies'>;

export default function StorePage() {
	const params = useParams();
	const router = useRouter();
	const { totalItems, items: cartItems, addItem } = useCart();
	const slug = params.slug as string;

	const [company, setCompany] = useState<Company | null>(null);
	const [products, setProducts] = useState<PublicProduct[]>([]);
	const [loading, setLoading] = useState(true);

	// Quantity sheet state
	const [showQuantitySheet, setShowQuantitySheet] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);

	useEffect(() => {
		async function fetchData() {
			try {
				setLoading(true);
				const companyData = await getCompanyBySlug(slug);

				if (!companyData) {
					notFound();
				}

				setCompany(companyData);
				const productsData = await getPublicProducts(companyData.id);
				setProducts(productsData);
			} catch (error) {
				console.error('Error fetching store data:', error);
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [slug]);

	const handleAddToCart = (product: PublicProduct) => {
		setSelectedProduct(product);
		setShowQuantitySheet(true);
	};

	// Get quantity for a product from cart
	const getProductQuantity = (productId: string): number => {
		const item = cartItems.find(item => item.product.id === productId);
		return item?.quantity || 0;
	};

	const handleConfirmQuantity = (quantity: number) => {
		if (selectedProduct) {
			addItem(selectedProduct, quantity);
		}
	};

	const handleCheckout = () => {
		router.push(`/company/${slug}/store/checkout`);
	};

	if (loading) {
		return <LoadingState message="Loading store..." />;
	}

	if (!company) {
		notFound();
	}

	return (
		<div className="container max-w-7xl mx-auto px-4 py-6">
			{/* Header Section */}
			<div className="flex items-end justify-between gap-4 mb-6">
				<div className="flex-1">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Fabric store</h1>
					{/* Search bar will be added in future iteration */}
				</div>

				{/* Illustration */}
				<div className="relative size-25 shrink-0">
					<Image
						src="/illustrations/store.png"
						alt="Store"
						fill
						sizes="100px"
						className="object-contain"
					/>
				</div>
			</div>

			{/* Product Grid */}
			{products.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<p className="text-gray-600 mb-2">No products available</p>
					<p className="text-sm text-gray-500">Check back soon for new items</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
					{products.map((product) => (
						<ProductCard
							key={product.id}
							product={product}
							quantity={getProductQuantity(product.id)}
							onAddToCart={handleAddToCart}
						/>
					))}
				</div>
			)}

			{/* Cart Footer */}
			{totalItems > 0 && (
				<div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
					<div className="container max-w-7xl mx-auto px-4 py-4">
						<Button onClick={handleCheckout} className="w-full flex items-center justify-between gap-3" size="lg">
							<div className="flex items-center gap-2 flex-1">
								<IconShoppingCart className="size-5" />
								<span>
									{totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
								</span>
							</div>
							<span>
								Checkout
							</span>
							<IconArrowRight className="size-5" />
						</Button>
					</div>
				</div>
			)}

			{/* Add padding at bottom to account for fixed footer */}
			<div className="h-20" />

			{/* Quantity Sheet */}
			<ProductQuantitySheet
				open={showQuantitySheet}
				onOpenChange={setShowQuantitySheet}
				product={selectedProduct}
				initialQuantity={selectedProduct ? getProductQuantity(selectedProduct.id) : 0}
				onConfirm={handleConfirmQuantity}
			/>
		</div>
	);
}
