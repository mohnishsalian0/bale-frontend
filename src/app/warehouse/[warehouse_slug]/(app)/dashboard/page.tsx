'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import { useSession } from '@/contexts/session-context';
import { getDashboardSalesOrders, getLowStockProducts, getPendingQRProducts, getRecentPartners } from '@/lib/queries/dashboard';
import type { DashboardSalesOrder, LowStockProduct, PendingQRProduct, RecentPartner } from '@/lib/queries/dashboard';
import { QuickActionButton, type QuickAction } from '@/components/ui/quick-action-button';
import { IconShirt, IconQrcode } from '@tabler/icons-react';
import IconGoodsInward from '@/components/icons/IconGoodsInward';
import IconGoodsOutward from '@/components/icons/IconGoodsOutward';

// Dynamic imports for below-the-fold sections
const PartnersSection = dynamic(() => import('./PartnersSection').then(mod => ({ default: mod.PartnersSection })), {
	loading: () => <SectionSkeleton />,
});

const ActiveSalesOrdersSection = dynamic(() => import('./ActiveSalesOrdersSection').then(mod => ({ default: mod.ActiveSalesOrdersSection })), {
	loading: () => <SectionSkeleton />,
});

const LowStockProductsSection = dynamic(() => import('./LowStockProductsSection').then(mod => ({ default: mod.LowStockProductsSection })), {
	loading: () => <SectionSkeleton />,
});

const PendingQRCodesSection = dynamic(() => import('./PendingQRCodesSection').then(mod => ({ default: mod.PendingQRCodesSection })), {
	loading: () => <SectionSkeleton />,
});

const AddProductSheet = dynamic(() => import('../inventory/AddProductSheet').then(mod => ({ default: mod.AddProductSheet })), {
	ssr: false, // Modal doesn't need SSR
});

// Loading skeleton for sections
function SectionSkeleton() {
	return (
		<div className="mt-6 px-4 animate-pulse">
			<div className="h-6 w-32 bg-gray-200 rounded mb-3" />
			<div className="h-32 bg-gray-100 rounded" />
		</div>
	);
}

export default function DashboardPage() {
	const router = useRouter();
	const { user, warehouse } = useSession();
	const [salesOrders, setSalesOrders] = useState<DashboardSalesOrder[]>([]);
	const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
	const [pendingQRProducts, setPendingQRProducts] = useState<PendingQRProduct[]>([]);
	const [recentCustomers, setRecentCustomers] = useState<RecentPartner[]>([]);
	const [recentSuppliers, setRecentSuppliers] = useState<RecentPartner[]>([]);
	const [totalCustomers, setTotalCustomers] = useState(0);
	const [totalSuppliers, setTotalSuppliers] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Sheet states
	const [showAddProductSheet, setShowAddProductSheet] = useState(false);

	// Quick actions array
	const quickActions: QuickAction[] = [
		{
			icon: IconShirt,
			label: 'Create product',
			href: `/warehouse/${warehouse.slug}/inventory?action=add`,
		},
		{
			icon: IconGoodsInward,
			label: 'Goods inward',
			href: `/warehouse/${warehouse.slug}/goods-inward/create`,
		},
		{
			icon: IconQrcode,
			label: 'QR code batch',
			href: `/warehouse/${warehouse.slug}/qr-codes/create`,
		},
		{
			icon: IconGoodsOutward,
			label: 'Goods outward',
			href: `/warehouse/${warehouse.slug}/goods-outward/create`,
		},
	];

	const fetchDashboardData = async () => {
		try {
			setLoading(true);
			setError(null);

			const [orders, lowStock, pendingQR, partnersData] = await Promise.all([
				getDashboardSalesOrders(warehouse.id),
				getLowStockProducts(warehouse.id),
				getPendingQRProducts(warehouse.id),
				getRecentPartners(),
			]);

			setSalesOrders(orders);
			setLowStockProducts(lowStock);
			setPendingQRProducts(pendingQR);
			setRecentCustomers(partnersData.customers);
			setRecentSuppliers(partnersData.suppliers);
			setTotalCustomers(partnersData.totalCustomers);
			setTotalSuppliers(partnersData.totalSuppliers);
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
					<h1 className="text-3xl font-bold text-gray-900">Welcome, {user.first_name}!</h1>
				</div>

				{/* Mascot */}
				<div className="relative size-25 shrink-0">
					<Image
						src="/mascot/dashboard-wave.png"
						alt="Dashboard mascot waving"
						fill
						sizes="100px"
						className="object-contain"
						priority
						quality={85}
					/>
				</div>
			</div>

			{/* Quick Actions */}
			<div className="flex gap-10 px-4 mt-6">
				{quickActions.map((action) => (
					<QuickActionButton
						key={action.label}
						action={action}
						onClick={() => {
							if (action.label === 'Create product') {
								setShowAddProductSheet(true);
							} else {
								router.push(action.href);
							}
						}}
					/>
				))}
			</div>

			{/* Customers Section */}
			{/* <div className="mt-6"> */}
			{/* 	<PartnersSection */}
			{/* 		title="Customers" */}
			{/* 		newButtonLabel="New customer" */}
			{/* 		partnerType="customer" */}
			{/* 		partners={recentCustomers} */}
			{/* 		totalCount={totalCustomers} */}
			{/* 		onPartnerAdded={fetchDashboardData} */}
			{/* 	/> */}
			{/* </div> */}
			{/**/}
			{/* Suppliers Section */}
			{/* <div className="mt-6"> */}
			{/* 	<PartnersSection */}
			{/* 		title="Suppliers" */}
			{/* 		newButtonLabel="New supplier" */}
			{/* 		partnerType="supplier" */}
			{/* 		partners={recentSuppliers} */}
			{/* 		totalCount={totalSuppliers} */}
			{/* 		onPartnerAdded={fetchDashboardData} */}
			{/* 	/> */}
			{/* </div> */}

			{/* Sales Orders Section */}
			<ActiveSalesOrdersSection
				orders={salesOrders}
				warehouseSlug={warehouse.slug}
				onNavigate={(path) => router.push(path)}
			/>

			{/* Low Stock Products Section */}
			<LowStockProductsSection
				products={lowStockProducts}
				warehouseSlug={warehouse.slug}
				onNavigate={(path) => router.push(path)}
			/>

			{/* Pending QR Codes Section */}
			<PendingQRCodesSection
				products={pendingQRProducts}
				warehouseSlug={warehouse.slug}
				onNavigate={(path) => router.push(path)}
			/>

			{/* Add Product Sheet */}
			<AddProductSheet
				open={showAddProductSheet}
				onOpenChange={setShowAddProductSheet}
				onProductAdded={fetchDashboardData}
			/>
		</div>
	);
}
