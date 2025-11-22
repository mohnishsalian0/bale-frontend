'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import ImageWrapper from '@/components/ui/image-wrapper';
import { useSession } from '@/contexts/session-context';
import { getDashboardSalesOrders, getLowStockProducts, getPendingQRProducts } from '@/lib/queries/dashboard';
import type { DashboardSalesOrder, LowStockProduct, PendingQRProduct } from '@/lib/queries/dashboard';
import { calculateCompletionPercentage, getOrderDisplayStatus, getProductSummary, type DisplayStatus } from '@/lib/utils/sales-order';
import { getPartnerName } from '@/lib/utils/partner';
import { getProductIcon, getProductInfo } from '@/lib/utils/product';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import { formatAbsoluteDate } from '@/lib/utils/date';
import type { SalesOrderStatus, StockType, MeasuringUnit } from '@/types/database/enums';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconDotsVertical, IconAlertTriangle } from '@tabler/icons-react';

export default function DashboardPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const [salesOrders, setSalesOrders] = useState<DashboardSalesOrder[]>([]);
	const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
	const [pendingQRProducts, setPendingQRProducts] = useState<PendingQRProduct[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);
			setError(null);

			const [orders, lowStock, pendingQR] = await Promise.all([
				getDashboardSalesOrders(warehouse.id),
				getLowStockProducts(warehouse.id),
				getPendingQRProducts(warehouse.id),
			]);

			setSalesOrders(orders);
			setLowStockProducts(lowStock);
			setPendingQRProducts(pendingQR);
		} catch (err) {
			console.error('Error fetching dashboard data:', err);
			setError(err instanceof Error ? err.message : 'Failed to load dashboard');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDashboardData();
	}, [warehouse.id]);

	// Loading state
	if (loading) {
		return <LoadingState message="Loading dashboard..." />;
	}

	// Error state
	if (error) {
		return (
			<ErrorState
				title="Failed to load dashboard"
				message={error}
				onRetry={() => window.location.reload()}
			/>
		);
	}

	return (
		<div className="relative flex flex-col flex-1 overflow-y-auto">
			{/* Quote Card */}
			<Card className="mx-4 mt-4">
				<CardContent className="p-4 text-center">
					<i className="text-gray-700">
						Life is a weave of threads — choose the colorful ones.
					</i>
				</CardContent>
			</Card>

			{/* Header */}
			<div className="flex items-end justify-between gap-4 px-4 pt-4">
				<div className="flex-1">
					<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
				</div>

				{/* Mascot */}
				<div className="relative size-25 shrink-0">
					<Image
						src="/mascot/dashboard-wave.png"
						alt="Dashboard"
						fill
						sizes="100px"
						className="object-contain"
					/>
				</div>
			</div>

			{/* Sales Orders Section */}
			<div className="flex flex-col mt-6">
				<div className="flex items-center justify-between px-4 py-2">
					<h2 className="text-lg font-bold text-gray-900">Active sales orders</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push(`/warehouse/${warehouse.slug}/sales-orders`)}
					>
						View all →
					</Button>
				</div>

				{salesOrders.length === 0 ? (
					<div className="px-4 py-8 text-center">
						<p className="text-sm text-gray-500">No pending or in-progress orders</p>
					</div>
				) : (
					<div className="px-4 flex flex-col gap-3">
						{salesOrders.map((order) => {
							const displayStatus: DisplayStatus = getOrderDisplayStatus(
								order.status as SalesOrderStatus,
								order.expected_delivery_date
							);
							const completionPercentage = calculateCompletionPercentage(order.sales_order_items);
							const showProgressBar = displayStatus === 'in_progress' || displayStatus === 'overdue';
							const progressColor = displayStatus === 'overdue' ? 'yellow' : 'blue';
							const customerName = order.customer ? getPartnerName(order.customer) : 'Unknown Customer';
							const products = order.sales_order_items.map((item) => ({
								name: item.product?.[0]?.name || 'Unknown Product',
								quantity: item.required_quantity,
							}));

							return (
								<Card
									key={order.id}
									className="rounded-none border-2 rounded-lg shadow-none bg-transparent"
								>
									<CardContent className="p-4 flex flex-col gap-3">
										<button
											onClick={() =>
												router.push(`/warehouse/${warehouse.slug}/sales-orders/${order.sequence_number}`)
											}
											className="flex flex-col gap-2 text-left"
										>
											{/* Title and Status Badge */}
											<div>
												<div className="flex items-center justify-between gap-2">
													<p className="text-base font-medium text-gray-900">{customerName}</p>
													<StatusBadge status={displayStatus} />
												</div>

												{/* Subtexts spanning full width */}
												<p className="text-xs text-gray-500 mt-1">
													{getProductSummary(products)}
												</p>
												<div className="flex items-center justify-between mt-1">
													<p className="text-xs text-gray-500">
														SO-{order.sequence_number}
														{order.expected_delivery_date &&
															` • Due on ${formatAbsoluteDate(order.expected_delivery_date)}`}
													</p>
													{order.status !== 'approval_pending' && (
														<p className="text-xs text-gray-500">{completionPercentage}% completed</p>
													)}
												</div>
											</div>

											{/* Progress Bar */}
											{showProgressBar && <Progress color={progressColor} value={completionPercentage} />}
										</button>

										{/* Action Buttons */}
										<div className="flex">
											{order.status === 'approval_pending' ? (
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														console.log('Approve order');
													}}
												>
													Approve order
												</Button>
											) : (
												<>
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															router.push(
																`/warehouse/${warehouse.slug}/goods-outward/create?order=${order.sequence_number}`
															);
														}}
													>
														Create outward
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															console.log('Make invoice');
														}}
													>
														Make invoice
													</Button>
												</>
											)}
											<DropdownMenu>
												<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
													<Button variant="ghost" size="icon-sm">
														<IconDotsVertical className="size-5" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{(order.status === 'in_progress' || displayStatus === 'overdue') && (
														<>
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	console.log('Mark as complete');
																}}
															>
																Mark as complete
															</DropdownMenuItem>
															<DropdownMenuSeparator />
														</>
													)}
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															console.log('Share');
														}}
													>
														Share
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															console.log('Download');
														}}
													>
														Download
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														variant="destructive"
														onClick={(e) => {
															e.stopPropagation();
															console.log('Cancel order');
														}}
													>
														Cancel order
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>

			{/* Low Stock Products Section */}
			<div className="flex flex-col mt-6">
				<div className="flex items-center justify-between px-4 py-2">
					<h2 className="text-lg font-bold text-gray-900">Low stock products</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push(`/warehouse/${warehouse.slug}/inventory`)}
					>
						View all →
					</Button>
				</div>

				{lowStockProducts.length === 0 ? (
					<div className="px-4 py-8 text-center">
						<p className="text-sm text-gray-500">No low stock products</p>
					</div>
				) : (
					<div className="flex flex-col gap-3 px-4">
						{lowStockProducts.map((product) => (
							<Card
								key={`low-stock-${product.id}`}
								className="rounded-none border-2 rounded-lg shadow-none bg-transparent cursor-pointer hover:bg-gray-50 transition-colors"
								onClick={() =>
									router.push(`/warehouse/${warehouse.slug}/inventory/${product.sequence_number}`)
								}
							>
								<CardContent className="p-4 flex gap-4 items-center">
									<ImageWrapper
										size="md"
										shape="square"
										imageUrl={product.product_images?.[0]}
										alt={product.name}
										placeholderIcon={getProductIcon(product.stock_type as StockType)}
									/>

									<div className="flex-1 flex flex-col items-start">
										<p className="font-medium text-gray-900">{product.name}</p>
										<p className="text-xs text-gray-500">
											{getProductInfo(product) || 'No details'}
										</p>
									</div>

									<div className="flex flex-col items-end gap-1">
										<div className="flex items-center gap-1">
											<IconAlertTriangle className="size-4 text-yellow-700" />
											<p className="text-base font-bold text-yellow-700">
												{product.current_stock}{' '}
												{getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit | null)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Pending QR Codes Section */}
			<div className="flex flex-col mt-6 pb-4">
				<div className="flex items-center justify-between px-4 py-2">
					<h2 className="text-lg font-bold text-gray-900">Pending QR codes</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => router.push(`/warehouse/${warehouse.slug}/inventory`)}
					>
						View all →
					</Button>
				</div>

				{pendingQRProducts.length === 0 ? (
					<div className="px-4 py-8 text-center">
						<p className="text-sm text-gray-500">No pending QR codes</p>
					</div>
				) : (
					<div className="flex flex-col gap-3 px-4">
						{pendingQRProducts.map((product) => (
							<Card
								key={`pending-qr-${product.id}`}
								className="rounded-none border-2 rounded-lg shadow-none bg-transparent cursor-pointer hover:bg-gray-50 transition-colors"
								onClick={() =>
									router.push(`/warehouse/${warehouse.slug}/inventory/${product.sequence_number}`)
								}
							>
								<CardContent className="p-4 flex gap-4 items-center">
									<ImageWrapper
										size="md"
										shape="square"
										imageUrl={product.product_images?.[0]}
										alt={product.name}
										placeholderIcon={getProductIcon(product.stock_type as StockType)}
									/>

									<div className="flex-1 flex flex-col items-start">
										<p className="font-medium text-gray-900">{product.name || 'Unknown product'}</p>
										<p className="text-xs text-gray-500">
											{getProductInfo(product) || 'No details'}
										</p>
									</div>

									<div className="flex flex-col items-end">
										<p className="text-sm font-medium text-gray-900">{product.pending_qr_count} QR codes</p>
										<p className="text-xs text-gray-500">pending</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
