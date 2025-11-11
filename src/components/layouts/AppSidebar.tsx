'use client';

import * as React from "react"
import type { ComponentType } from 'react';
import {
	IconBuildingStore,
	IconChartBar,
	IconClipboardList,
	IconExternalLink,
	IconIdBadge2,
	IconPhotoScan,
	IconQrcode,
	IconSettings,
	IconUsers,
} from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useWarehouse } from '@/contexts/warehouse-context';
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar"

type NavItem = {
	label: string;
	path: string;
	icon: ComponentType<{ className?: string }>;
	trailingIcon?: ComponentType<{ className?: string }>;
	external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
	{
		label: 'Job work',
		path: 'job-work',
		icon: IconClipboardList,
	},
	{
		label: 'QR codes',
		path: 'qr-codes',
		icon: IconQrcode,
	},
	{
		label: 'Partners',
		path: 'partners',
		icon: IconUsers,
	},
	{
		label: 'Staff',
		path: 'staff',
		icon: IconIdBadge2,
	},
	{
		label: 'Reports',
		path: 'reports',
		icon: IconChartBar,
	},
	{
		label: 'Settings',
		path: 'settings',
		icon: IconSettings,
	},
	{
		label: 'Online store',
		path: '/catalog',
		icon: IconBuildingStore,
		external: true,
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const { warehouseSlug } = useWarehouse();

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild className='p-2 h-auto'>
							<a href="#">
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-11 items-center justify-center rounded-lg">
									<IconPhotoScan className="size-6" />
								</div>
								<div className="flex flex-col leading-none">
									<span className="text-lg font-medium">Bale Inventory</span>
									<span className="text-sm text-gray-500">v1.0.0</span>
								</div>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu className="gap-0">
					{NAV_ITEMS.map((item) => {
						const href = item.external ? item.path : `/warehouse/${warehouseSlug}/${item.path}`;
						const isActive = pathname === href;
						const TrailingIcon = item.trailingIcon;

						return (
							<SidebarMenuItem key={item.label}>
								<SidebarMenuButton
									asChild
									isActive={isActive}
									size='lg'
									className='text-base [&>svg]:size-5 p-4 gap-3 text-gray-700'
								>
									<Link
										href={href}
										target={item.external ? '_blank' : undefined}
										rel={item.external ? 'noreferrer' : undefined}
										className='flex items-center rounded-none'
									>
										<item.icon />
										<span className='flex-1'>{item.label}</span>
										{TrailingIcon ? <TrailingIcon /> : null}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	)
}
