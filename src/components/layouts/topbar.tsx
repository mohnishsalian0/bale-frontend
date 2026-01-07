"use client";

import { useRouter } from "next/navigation";
import { IconChevronDown, IconLogout, IconBuilding } from "@tabler/icons-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useSession } from "@/contexts/session-context";
import { getInitials } from "@/lib/utils/initials";
import ImageWrapper from "../ui/image-wrapper";
import Logo from "../icons/Logo";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
// import { SidebarTrigger } from "../ui/sidebar";

interface TopBarProps {
  onWarehouseClick?: () => void;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
  isWarehouseSelectorOpen?: boolean;
}

export default function TopBar({
  onWarehouseClick,
  onSettingsClick,
  onLogoutClick,
  isWarehouseSelectorOpen = false,
}: TopBarProps) {
  const router = useRouter();
  const { user, warehouse } = useSession();
  const isMobile = useIsMobile();

  const handleCompanySettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      router.push("/company");
    }
  };

  return (
    <div
      className={`z-30 sticky top-0 bg-background-100 ${
        isWarehouseSelectorOpen ? "" : "border-b border-border"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu + Warehouse selector */}
        <div className="flex items-center gap-2">
          {/* {isMobile && <SidebarTrigger className="size-10 text-gray-700" />} */}
          {isMobile && (
            <Link
              href={`/warehouse/${warehouse.slug}/dashboard`}
              className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg"
            >
              <Logo className="size-8" />
            </Link>
          )}

          {/* Warehouse Selector */}
          <Button variant="ghost" size="lg" onClick={onWarehouseClick}>
            <span className="font-medium text-gray-700">{warehouse.name}</span>
            <IconChevronDown className="w-5 h-5 text-gray-700" />
          </Button>
        </div>

        {/* Right side - Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative w-10 h-10 rounded-full border-2 border-border overflow-hidden"
            >
              <ImageWrapper
                size="sm"
                shape="circle"
                imageUrl={user.profile_image_url || undefined}
                alt={user.first_name + user.last_name}
                placeholderInitials={getInitials(
                  user.first_name + " " + user.last_name,
                )}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCompanySettingsClick}>
              <IconBuilding className="text-gray-700" />
              <span>Company settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogoutClick} variant="destructive">
              <IconLogout />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
