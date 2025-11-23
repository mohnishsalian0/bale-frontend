'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/contexts/session-context';

interface NavItem {
	path: string;
	label: string;
	icon: string;
}

const navItems: NavItem[] = [
	{ path: 'dashboard', label: 'Home', icon: '/illustrations/dashboard.png' },
	{ path: 'inventory', label: 'Inventory', icon: '/illustrations/inventory.png' },
	{ path: 'stock-flow', label: 'Stock flow', icon: '/illustrations/stock-flow.png' },
	{ path: 'sales-orders', label: 'Sales orders', icon: '/illustrations/sales-order.png' },
];

export default function BottomNav() {
	const pathname = usePathname();
	const { warehouse } = useSession();

	return (
		<div className="z-30 sticky bottom-0 bg-background-100 border-t border-border">
			<div className="flex items-center justify-between px-4 h-16">
				{navItems.map((item) => {
					const href = `/warehouse/${warehouse.slug}/${item.path}`;
					const isActive = pathname === href;

					return (
						<Link
							key={item.path}
							href={href}
							className="flex flex-col items-center gap-1 min-w-[40px]"
						>
							<div className={`relative w-6 h-6 ${!isActive ? 'grayscale' : ''}`}>
								<Image
									src={item.icon}
									alt={item.label}
									fill
									sizes='24px'
									className="object-contain"
								/>
							</div>
							<span
								className={`text-xs ${isActive
									? 'text-primary-700 font-semibold'
									: 'text-gray-500 font-medium'
									}`}
							>
								{item.label}
							</span>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
