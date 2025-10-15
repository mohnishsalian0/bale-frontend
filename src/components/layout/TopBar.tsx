'use client';

import { IconMenu2, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

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
  onMenuClick,
  onWarehouseClick,
  onProfileClick,
  isWarehouseSelectorOpen = false,
}: TopBarProps) {
  return (
    <div className={`fixed top-0 left-0 right-0 bg-background-100 z-50 transition-shadow ${
      isWarehouseSelectorOpen ? '' : 'shadow-sm'
    }`}>
      <div className="flex items-center justify-between pl-2 pr-4 py-3">
        {/* Left side - Menu + Warehouse selector */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-11 w-11"
          >
            <IconMenu2 className="w-5 h-5 text-gray-700" />
          </Button>

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
    </div>
  );
}
