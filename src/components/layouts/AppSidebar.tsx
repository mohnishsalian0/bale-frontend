'use client';

import * as React from "react"
import type { ComponentType } from 'react';
import {
	IconBuildingStore,
	IconChartBar,
	IconClipboardList,
	IconIdBadge2,
	IconPhotoScan,
	IconQrcode,
	IconSettings,
	IconUsers,
} from '@tabler/icons-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/contexts/warehouse-context';
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar"

type NavItem = {
	label: string;
	path: string;
	icon: ComponentType<{ className?: string }>;
	trailingIcon?: ComponentType<{ className?: string }>;
	external?: boolean;
	permission: string;
};

const NAV_ITEMS: NavItem[] = [
	{
		label: 'Job work',
		path: 'job-work',
		icon: IconClipboardList,
		permission: 'job_works.read',
	},
	{
		label: 'QR codes',
		path: 'qr-codes',
		icon: IconQrcode,
		permission: 'inventory.qr_batches.read',
	},
	{
		label: 'Partners',
		path: 'partners',
		icon: IconUsers,
		permission: 'partners.read',
	},
	{
		label: 'Staff',
		path: 'staff',
		icon: IconIdBadge2,
		permission: 'users.read',
	},
	{
		label: 'Reports',
		path: 'reports',
		icon: IconChartBar,
		permission: 'reports.read',
	},
	{
		label: 'Settings',
		path: 'settings',
		icon: IconSettings,
		permission: 'companies.read',
	},
	{
		label: 'Online store',
		path: '/catalog',
		icon: IconBuildingStore,
		external: true,
		permission: 'catalog.read',
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const { warehouse, hasPermission } = useSession();
	const { setOpenMobile, isMobile, setOpen } = useSidebar();

	const handleClick = () => {
		if (isMobile) {
			setOpenMobile(false);
		}
	}

	const handleMouseEnter = () => {
		if (!isMobile) {
			setOpen(true);
		}
	}

	const handleMouseLeave = () => {
		if (!isMobile) {
			setOpen(false);
		}
	}

	// Filter navigation items based on user permissions
	const visibleNavItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

	return (
		<Sidebar
			collapsible="icon"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			{...props}
		>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							size='lg'
							onClick={handleClick}
						>
							<Link
								href="#"
							>
								<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg -ml-1">
									<IconPhotoScan className="size-5" />
								</div>
								<div className="flex flex-col leading-none">
									<span className="pl-1 text-lg font-medium text-nowrap">Bale Inventory</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu className="gap-0">
					{visibleNavItems.map((item) => {
						const href = item.external ? item.path : `/warehouse/${warehouse.slug}/${item.path}`;
						const isActive = pathname === href;
						const TrailingIcon = item.trailingIcon;

						return (
							<SidebarMenuItem key={item.label}>
								<SidebarMenuButton
									asChild
									isActive={isActive}
									size='lg'
									onClick={handleClick}
								>
									<Link
										href={href}
										target={item.external ? '_blank' : undefined}
										rel={item.external ? 'noreferrer' : undefined}
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
