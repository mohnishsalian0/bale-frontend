'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { IconCheck, IconDownload, IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCompanyBySlug } from '@/lib/queries/catalog';
import { getSalesOrderBySequenceNumber } from '@/lib/queries/catalog-orders';
import { LoadingState } from '@/components/layouts/loading-state';
import { OrderConfirmationPDF } from '@/components/pdf/OrderConfirmationPDF';
import { pdf } from '@react-pdf/renderer';
import type { Tables } from '@/types/database/supabase';
import { toast } from 'sonner';

type Company = Tables<'companies'>;

export default function OrderConfirmationPage() {
	const params = useParams();
	const router = useRouter();
	const slug = params.slug as string;
	const orderNumber = parseInt(params.order_number as string);

	const [company, setCompany] = useState<Company | null>(null);
	const [order, setOrder] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [downloading, setDownloading] = useState(false);

	useEffect(() => {
		async function fetchData() {
			try {
				const companyData = await getCompanyBySlug(slug);
				if (!companyData) {
					router.push('/');
					return;
				}
				setCompany(companyData);

				const orderData = await getSalesOrderBySequenceNumber(companyData.id, orderNumber);
				if (!orderData) {
					toast.error('Order not found');
					router.push(`/company/${slug}/store`);
					return;
				}
				setOrder(orderData);
			} catch (error) {
				console.error('Error fetching order:', error);
				toast.error('Failed to load order details');
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [slug, orderNumber, router]);

	const handleDownloadPDF = async () => {
		if (!company || !order) return;

		try {
			setDownloading(true);
			const blob = await pdf(
				<OrderConfirmationPDF company={company} order={order} />
			).toBlob();

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `order-${order.sequence_number}.pdf`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast.success('PDF downloaded successfully');
		} catch (error) {
			console.error('Error downloading PDF:', error);
			toast.error('Failed to download PDF');
		} finally {
			setDownloading(false);
		}
	};

	if (loading) {
		return <LoadingState message="Loading order details..." />;
	}

	if (!company || !order) {
		return null;
	}

	return (
		<div className="container max-w-4xl mx-auto px-4 py-6">
			{/* Success Header */}
			<div className="text-center mb-8">
				<div className="inline-flex items-center justify-center size-16 bg-green-100 rounded-full mb-4">
					<IconCheck className="size-8 text-green-600" />
				</div>
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
				<p className="text-gray-600">
					Thank you for your order. We'll get back to you soon.
				</p>
			</div>

			{/* Order Details */}
			<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
						<p className="text-sm text-gray-500 mt-1">Order #{order.sequence_number}</p>
					</div>
					<Badge color="orange">{order.status.replace('_', ' ')}</Badge>
				</div>

				{/* Order Items */}
				<div className="mb-6">
					<h3 className="text-sm font-medium text-gray-700 mb-3">Items</h3>
					<div className="space-y-3">
						{order.sales_order_items?.map((item: any) => (
							<div key={item.id} className="flex items-center gap-4">
								{item.product?.product_images && item.product.product_images.length > 0 ? (
									<div className="relative size-16 bg-gray-100 rounded overflow-clip shrink-0">
										<Image
											src={item.product.product_images[0]}
											alt={item.product.name}
											fill
											sizes="64px"
											className="object-cover"
										/>
									</div>
								) : (
									<div className="size-16 bg-gray-100 rounded shrink-0" />
								)}
								<div className="flex-1 min-w-0">
									<p className="font-medium text-gray-900 truncate" title={item.product?.name}>
										{item.product?.name}
									</p>
									<p className="text-sm text-gray-500">
										PROD-{item.product?.sequence_number}
									</p>
								</div>
								<div className="text-right shrink-0">
									<p className="text-sm font-medium text-gray-900">Qty: {item.quantity}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Customer Information */}
				<div className="border-t border-gray-200 pt-6">
					<h3 className="text-sm font-medium text-gray-700 mb-3">Contact Details</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<p className="text-gray-500">Name</p>
							<p className="text-gray-900 font-medium">{order.customer?.name}</p>
						</div>
						<div>
							<p className="text-gray-500">Email</p>
							<p className="text-gray-900 font-medium">{order.customer?.email}</p>
						</div>
						<div>
							<p className="text-gray-500">Phone</p>
							<p className="text-gray-900 font-medium">{order.customer?.phone}</p>
						</div>
						{order.customer?.gstin && (
							<div>
								<p className="text-gray-500">GSTIN</p>
								<p className="text-gray-900 font-medium">{order.customer.gstin}</p>
							</div>
						)}
					</div>
				</div>

				{/* Address */}
				<div className="border-t border-gray-200 pt-6 mt-6">
					<h3 className="text-sm font-medium text-gray-700 mb-3">Delivery Address</h3>
					<div className="text-sm text-gray-900">
						<p>{order.customer?.address_line_1}</p>
						{order.customer?.address_line_2 && <p>{order.customer.address_line_2}</p>}
						<p>
							{order.customer?.city}, {order.customer?.state} {order.customer?.pin_code}
						</p>
						<p>{order.customer?.country}</p>
					</div>
				</div>

				{/* Special Instructions */}
				{order.notes && (
					<div className="border-t border-gray-200 pt-6 mt-6">
						<h3 className="text-sm font-medium text-gray-700 mb-2">Special Instructions</h3>
						<p className="text-sm text-gray-600">{order.notes}</p>
					</div>
				)}
			</div>

			{/* Action Buttons */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
				<Button
					variant="outline"
					onClick={() => router.push(`/company/${slug}/store`)}
				>
					<IconArrowLeft className="size-4" />
					Back to Store
				</Button>
				<Button onClick={handleDownloadPDF} disabled={downloading}>
					{downloading ? (
						<>
							<IconDownload className="size-4 animate-pulse" />
							Downloading...
						</>
					) : (
						<>
							<IconDownload className="size-4" />
							Download PDF
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
