'use client';

import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import Image from 'next/image';
import { SidebarTrigger } from '../ui/sidebar';

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
		<div className={`sticky top-0 bg-background-100 ${isWarehouseSelectorOpen ? '' : 'border-b border-gray-200'
			}`}>
			<div className="flex items-center justify-between pl-2 pr-4 py-3">
				{/* Left side - Menu + Warehouse selector */}
				<div className="flex items-center gap-2">
					{/* Menu Button */}
					<SidebarTrigger className='w-10 h-10 text-gray-700' />

					{/* Warehouse Selector */}
					<button
						onClick={onWarehouseClick}
						className="flex items-center gap-2 h-10 hover:bg-gray-50 rounded-lg px-2 transition-colors"
					>
						<span className="text-sm font-medium text-gray-700">
							{warehouseName}
						</span>
						{isWarehouseSelectorOpen ? (
							<IconChevronUp className="w-5 h-5 text-gray-700" />
						) : (
							<IconChevronDown className="w-5 h-5 text-gray-700" />
						)}
					</button>
				</div>

				{/* Right side - Profile */}
				<button
					onClick={onProfileClick}
					className="relative w-10 h-10 rounded-full overflow-hidden hover:ring-2 hover:ring-primary-700 transition-all"
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
				</button>
			</div>
		</div >
	);
}
