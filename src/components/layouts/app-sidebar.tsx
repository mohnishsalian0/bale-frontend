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
  IconTruckDelivery,
  IconTruckLoading,
  IconShirt,
  IconBuilding,
  IconListDetails,
  IconTransfer,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { warehouse } = useSession();
  const { setOpenMobile, isMobile, setOpen } = useSidebar();

  const NAV_GROUPS: NavGroup[] = [
    {
      title: "Inventory",
      nav_items: [
        {
          label: "Products",
          path: `/warehouse/${warehouse.slug}/products`,
          icon: IconShirt,
          permission: "inventory.products.read",
        },
        {
          label: "Goods In & Out",
          path: `/warehouse/${warehouse.slug}/goods-movement`,
          icon: IconTransfer,
          permission: "movement.read",
        },
        {
          label: "Goods Transfer",
          path: `/warehouse/${warehouse.slug}/goods-transfer`,
          icon: IconTruckDelivery,
          permission: "movement.read",
        },
        {
          label: "QR codes",
          path: `/warehouse/${warehouse.slug}/qr-codes`,
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
          path: `/warehouse/${warehouse.slug}/sales-orders`,
          icon: IconShoppingCart,
          permission: "sales_orders.read",
        },
        {
          label: "Purchase orders",
          path: `/warehouse/${warehouse.slug}/purchase-orders`,
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
          path: `/warehouse/${warehouse.slug}/invoices`,
          icon: IconReceipt,
          permission: "invoices.read",
        },
        {
          label: "Payments",
          path: `/warehouse/${warehouse.slug}/payments`,
          icon: IconCash,
          permission: "payments.read",
        },
        {
          label: "Adjustment Notes",
          path: `/warehouse/${warehouse.slug}/adjustment-notes`,
          icon: IconReceiptRefund,
          permission: "invoices.read",
        },
        {
          label: "Chart of Accounts",
          path: `/warehouse/${warehouse.slug}/accounting/ledgers`,
          icon: IconListDetails,
          permission: "invoices.read",
        },
      ],
    },
    {
      title: "Business",
      nav_items: [
        {
          label: "Partners",
          path: `/warehouse/${warehouse.slug}/partners`,
          icon: IconUsers,
          permission: "partners.read",
        },
        {
          label: "Staff",
          path: `/warehouse/${warehouse.slug}/staff`,
          icon: IconIdBadge2,
          permission: "users.read",
        },
        {
          label: "Company",
          path: "/company",
          icon: IconBuilding,
          permission: "companies.read",
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
                  const href = item.path;
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
