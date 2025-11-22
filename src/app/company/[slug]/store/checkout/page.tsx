'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCart, type CartItem } from '@/contexts/cart-context';
import { getCompanyBySlug } from '@/lib/queries/catalog';
import { createCatalogOrder } from '@/lib/queries/catalog-orders';
import { LoadingState } from '@/components/layouts/loading-state';
import { ProductQuantitySheet } from '../ProductQuantitySheet';
import type { Tables } from '@/types/database/supabase';
import { toast } from 'sonner';
import ImageWrapper from '@/components/ui/image-wrapper';
import { getProductIcon, getProductInfo } from '@/lib/utils/product';
import { MeasuringUnit, StockType } from '@/types/database/enums';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';

type Company = Tables<'companies'>;

interface CheckoutFormData {
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	state: string;
	country: string;
	pinCode: string;
	gstin: string;
	specialInstructions: string;
	termsAccepted: boolean;
}

export default function CheckoutPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const { items: cartItems, clearCart, updateQuantity } = useCart();

	const [company, setCompany] = useState<Company | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	// Quantity sheet state
	const [showQuantitySheet, setShowQuantitySheet] = useState(false);
	const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);

	const [formData, setFormData] = useState<CheckoutFormData>({
		firstName: '',
		lastName: '',
		phone: '',
		email: '',
		addressLine1: '',
		addressLine2: '',
		city: '',
		state: '',
		country: '',
		pinCode: '',
		gstin: '',
		specialInstructions: '',
		termsAccepted: false,
	});

	useEffect(() => {
		async function fetchCompany() {
			try {
				const companyData = await getCompanyBySlug(slug);
				if (!companyData) {
					router.push('/');
					return;
				}
				setCompany(companyData);
			} catch (error) {
				console.error('Error fetching company:', error);
				toast.error('Failed to load checkout page');
			} finally {
				setLoading(false);
			}
		}

		fetchCompany();
	}, [slug, router]);

	// Redirect if cart is empty
	useEffect(() => {
		if (!loading && cartItems.length === 0) {
			router.push(`/company/${slug}/store`);
		}
	}, [cartItems, loading, slug, router]);

	const handleOpenQuantitySheet = (item: CartItem) => {
		setSelectedItem(item);
		setShowQuantitySheet(true);
	};

	const handleConfirmQuantity = (quantity: number) => {
		if (selectedItem) {
			updateQuantity(selectedItem.product.id, quantity);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!company) return;

		// Basic validation
		if (!formData.firstName || !formData.lastName || !formData.phone || !formData.email) {
			toast.error('Please fill in all required contact details');
			return;
		}

		if (!formData.addressLine1 || !formData.city || !formData.state || !formData.country || !formData.pinCode) {
			toast.error('Please fill in all required address fields');
			return;
		}

		if (!formData.termsAccepted) {
			toast.error('You must accept the terms and conditions');
			return;
		}

		try {
			setSubmitting(true);
			const order = await createCatalogOrder({
				companyId: company.id,
				formData,
				cartItems,
			});

			// Clear cart after successful order
			clearCart();

			// Redirect to order confirmation page
			router.push(`/company/${slug}/order/${order.sequence_number}`);
			toast.success('Order placed successfully!');
		} catch (error) {
			console.error('Error creating order:', error);
			toast.error('Failed to place order. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return <LoadingState message="Loading checkout..." />;
	}

	if (!company || cartItems.length === 0) {
		return null;
	}

	return (
		<div className="container max-w-4xl mx-auto px-4 py-6">
			{/* Header */}
			<div className="mb-6">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => router.push(`/company/${slug}/store`)}
					className="mb-4"
				>
					<IconArrowLeft className="size-4" />
					Back to store
				</Button>
				<div className="flex items-end justify-between gap-4 mb-6">
					<div className="flex-1">
						<h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
					</div>

					{/* Illustration */}
					<div className="relative size-25 shrink-0">
						<Image
							src="/illustrations/sales-order-cart.png"
							alt="Store"
							fill
							sizes="100px"
							className="object-contain"
						/>
					</div>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Items Summary */}
				<section className="rounded-lg border-2 border-border p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
					<div className="space-y-6">
						{cartItems.map((item) => {
							const imageUrl = item.product.product_images?.[0];
							const productInfoText = getProductInfo(item.product);
							const unitAbbreviation = getMeasuringUnitAbbreviation(item.product.measuring_unit as MeasuringUnit | null);

							return (
								<div
									key={item.product.id}
									className="flex items-center"
								>
									{/* Product Image */}
									<ImageWrapper
										size="md"
										shape="square"
										imageUrl={imageUrl}
										alt={item.product.name}
										placeholderIcon={getProductIcon(item.product.stock_type as StockType)}
									/>

									{/* Product Info */}
									<div className="flex-1 min-w-0">
										<p title={item.product.name} className="text-base font-medium text-gray-700 truncate">
											{item.product.name}
										</p>
										<p title={productInfoText} className="text-xs text-gray-500 truncate">
											{productInfoText}
										</p>
									</div>

									{/* Quantity Button */}
									<Button
										type="button"
										size="sm"
										onClick={() => handleOpenQuantitySheet(item)}
									>
										{item.quantity} {unitAbbreviation}
									</Button>
								</div>
							);
						})}
					</div>
				</section>

				{/* Contact Details */}
				<section className="rounded-lg border-2 border-border p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
								First Name <span className="text-destructive-foreground">*</span>
							</label>
							<Input
								id="firstName"
								value={formData.firstName}
								onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
								required
							/>
						</div>

						<div>
							<label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
								Last Name <span className="text-destructive-foreground">*</span>
							</label>
							<Input
								id="lastName"
								value={formData.lastName}
								onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
								required
							/>
						</div>

						<div>
							<label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
								Phone <span className="text-destructive-foreground">*</span>
							</label>
							<Input
								id="phone"
								type="tel"
								value={formData.phone}
								onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
								required
							/>
						</div>

						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
								Email <span className="text-destructive-foreground">*</span>
							</label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) => setFormData({ ...formData, email: e.target.value })}
								required
							/>
						</div>
					</div>
				</section>

				{/* Address */}
				<section className="rounded-lg border-2 border-border p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
					<div className="space-y-4">
						<div>
							<label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
								Address Line 1 <span className="text-destructive-foreground">*</span>
							</label>
							<Input
								id="addressLine1"
								value={formData.addressLine1}
								onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
								required
							/>
						</div>

						<div>
							<label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
								Address Line 2
							</label>
							<Input
								id="addressLine2"
								value={formData.addressLine2}
								onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
									City <span className="text-destructive-foreground">*</span>
								</label>
								<Input
									id="city"
									value={formData.city}
									onChange={(e) => setFormData({ ...formData, city: e.target.value })}
									required
								/>
							</div>

							<div>
								<label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
									State <span className="text-destructive-foreground">*</span>
								</label>
								<Input
									id="state"
									value={formData.state}
									onChange={(e) => setFormData({ ...formData, state: e.target.value })}
									required
								/>
							</div>

							<div>
								<label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
									Country <span className="text-destructive-foreground">*</span>
								</label>
								<Input
									id="country"
									value={formData.country}
									onChange={(e) => setFormData({ ...formData, country: e.target.value })}
									required
								/>
							</div>

							<div>
								<label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
									Pin Code <span className="text-destructive-foreground">*</span>
								</label>
								<Input
									id="pinCode"
									value={formData.pinCode}
									onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
									required
								/>
							</div>
						</div>
					</div>
				</section>

				{/* Additional Information */}
				<section className="rounded-lg border-2 border-border p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
					<div className="space-y-4">
						<div>
							<label htmlFor="gstin" className="block text-sm font-medium text-gray-700 mb-1">
								GSTIN
							</label>
							<Input
								id="gstin"
								placeholder="22AAAAA0000A1Z5"
								value={formData.gstin}
								onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
							/>
						</div>

						<div>
							<label
								htmlFor="specialInstructions"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Special Instructions
							</label>
							<Textarea
								id="specialInstructions"
								rows={4}
								placeholder="Any special instructions or notes for your order..."
								value={formData.specialInstructions}
								onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
							/>
						</div>
					</div>
				</section>

				{/* Terms and Conditions */}
				<div className="flex items-start gap-2">
					<Checkbox
						id="termsAccepted"
						checked={formData.termsAccepted}
						onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: checked === true })}
					/>
					<label htmlFor="termsAccepted" className="text-sm text-gray-700 cursor-pointer">
						I agree to the terms and conditions <span className="text-destructive-foreground">*</span>
					</label>
				</div>

				{/* Submit Buttons */}
				<div className="flex items-center justify-between gap-4 pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push(`/company/${slug}/store`)}
						disabled={submitting}
					>
						Back
					</Button>
					<Button type="submit" disabled={submitting} size="lg">
						{submitting ? (
							<>
								<IconLoader2 className="size-4 animate-spin" />
								Processing...
							</>
						) : (
							'Confirm Order'
						)}
					</Button>
				</div>
			</form>

			{/* Quantity Sheet */}
			<ProductQuantitySheet
				open={showQuantitySheet}
				onOpenChange={setShowQuantitySheet}
				product={selectedItem?.product || null}
				initialQuantity={selectedItem?.quantity}
				onConfirm={handleConfirmQuantity}
			/>
		</div>
	);
}
