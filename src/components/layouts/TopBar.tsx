'use client';

import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import Image from 'next/image';
import { SidebarTrigger } from '../ui/sidebar';
import { Button } from '../ui/button';

interface TopBarProps {
	warehouseName: string;
	profileImage?: string;
	onMenuClick?: () => void;
	onWarehouseClick?: () => void;
	onProfileClick?: () => void;
	isWarehouseSelectorOpen?: boolean;
}

export default function TopBar({
	warehouseName,
	profileImage,
	onWarehouseClick,
	onProfileClick,
	isWarehouseSelectorOpen = false,
}: TopBarProps) {
	return (
		<div className={`z-30 sticky top-0 bg-background-100 ${isWarehouseSelectorOpen ? '' : 'border-b border-gray-200'
			}`}>
			<div className="flex items-center justify-between pl-2 pr-4 py-3">
				{/* Left side - Menu + Warehouse selector */}
				<div className="flex items-center gap-2">
					{/* Menu Button */}
					<SidebarTrigger className='w-10 h-10 text-gray-700' />

					{/* Warehouse Selector */}
					<Button
						variant="ghost"
						onClick={onWarehouseClick}
						className="h-10 px-2"
					>
						<span className="text-sm font-medium text-gray-700">
							{warehouseName}
						</span>
						{isWarehouseSelectorOpen ? (
							<IconChevronUp className="w-5 h-5 text-gray-700" />
						) : (
							<IconChevronDown className="w-5 h-5 text-gray-700" />
						)}
					</Button>
				</div>

				{/* Right side - Profile */}
				<Button
					variant="ghost"
					size="icon"
					onClick={onProfileClick}
					className="relative w-10 h-10 rounded-full overflow-hidden hover:ring-2 hover:ring-primary-700 transition-all p-0"
				>
					{profileImage ? (
						<Image
							src={profileImage}
							alt="Profile"
							fill
							className="object-cover"
						/>
					) : (
						<div className="w-full h-full bg-primary-200 flex items-center justify-center">
							<span className="text-primary-700 font-semibold text-sm">
								{warehouseName.charAt(0)}
							</span>
						</div>
					)}
				</Button>
			</div>
		</div >
	);
}
