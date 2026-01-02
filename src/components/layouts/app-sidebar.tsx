"use client";

import * as React from "react";
import type { ComponentType } from "react";
import {
  IconIdBadge2,
  IconQrcode,
  IconReceipt,
  IconUsers,
  IconCash,
  IconReceiptRefund,
  IconShoppingCart,
  IconTruck,
  IconTruckLoading,
  IconShirt,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/contexts/session-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import Logo from "../icons/Logo";
import { PermissionGate } from "../auth/PermissionGate";

type NavGroup = {
  title: string;
  nav_items: NavItem[];
};

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  trailingIcon?: ComponentType<{ className?: string }>;
  external?: boolean;
  permission: string;
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Inventory",
    nav_items: [
      {
        label: "Products",
        path: "products",
        icon: IconShirt,
        permission: "inventory.products.read",
      },
      {
        label: "Goods movement",
        path: "stock-flow",
        icon: IconTruck,
        permission: "movement.read",
      },
      {
        label: "QR codes",
        path: "qr-codes",
        icon: IconQrcode,
        permission: "inventory.qr_batches.read",
      },
    ],
  },
  {
    title: "Orders",
    nav_items: [
      {
        label: "Sales orders",
        path: "sales-orders",
        icon: IconShoppingCart,
        permission: "sales_orders.read",
      },
      {
        label: "Purchase orders",
        path: "purchase-orders",
        icon: IconTruckLoading,
        permission: "purchase_orders.read",
      },
    ],
  },
  {
    title: "Bills & Payments",
    nav_items: [
      {
        label: "Invoices",
        path: "invoices",
        icon: IconReceipt,
        permission: "invoices.read",
      },
      {
        label: "Payments",
        path: "payments",
        icon: IconCash,
        permission: "payments.read",
      },
      {
        label: "Adjustment Notes",
        path: "adjustment-notes",
        icon: IconReceiptRefund,
        permission: "invoices.read",
      },
    ],
  },
  {
    title: "Business",
    nav_items: [
      {
        label: "Partners",
        path: "partners",
        icon: IconUsers,
        permission: "partners.read",
      },
      {
        label: "Staff",
        path: "staff",
        icon: IconIdBadge2,
        permission: "users.read",
      },
    ],
  },
  // {
  //   label: "Reports",
  //   path: "reports",
  //   icon: IconChartBar,
  //   permission: "reports.read",
  // },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { warehouse } = useSession();
  const { setOpenMobile, isMobile, setOpen } = useSidebar();

  const handleClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setOpen(false);
    }
  };

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
            <SidebarMenuButton asChild size="lg" onClick={handleClick}>
              <Link href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg -ml-1">
                  <Logo className="size-6" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="pl-1 text-lg font-medium text-nowrap">
                    Bale Inventory
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((item) => (
          <SidebarGroup className="p-0" key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {item.nav_items.map((item) => {
                  const href = item.external
                    ? item.path
                    : `/warehouse/${warehouse.slug}/${item.path}`;
                  const isActive = pathname === href;
                  const TrailingIcon = item.trailingIcon;

                  return (
                    <SidebarMenuItem key={item.label}>
                      <PermissionGate permission={item.permission}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          size="lg"
                          onClick={handleClick}
                        >
                          <Link
                            href={href}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noreferrer" : undefined}
                          >
                            <item.icon />
                            <span className="flex-1">{item.label}</span>
                            {TrailingIcon ? <TrailingIcon /> : null}
                          </Link>
                        </SidebarMenuButton>
                      </PermissionGate>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
