"use client";

import { useState, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { ContextMenuItem as MenuItem } from "@/lib/utils/context-menu-items";

interface ResponsiveContextMenuProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
  title?: string;
}

export function ResponsiveContextMenu({
  children,
  menuItems,
  title = "Actions",
}: ResponsiveContextMenuProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (isMobile) {
        e.preventDefault();
        setDrawerOpen(true);
      }
    },
    [isMobile],
  );

  const handleTouchStart = useCallback(() => {
    if (!isMobile) return;

    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 400);
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;

    setIsLongPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, [isMobile]);

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setDrawerOpen(false);
  };

  // Filter out hidden and get last non-destructive item index for separator
  const visibleItems = menuItems.filter((item) => !item.hidden);
  const lastNonDestructiveIndex = visibleItems.findIndex(
    (item) => item.variant === "destructive",
  );

  if (isMobile) {
    return (
      <>
        <div
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="touch-none"
          style={{
            transform: isLongPressing ? "scale(0.98)" : "scale(1)",
            opacity: isLongPressing ? 0.9 : 1,
            transition: "transform 0.15s ease, opacity 0.15s ease",
          }}
        >
          {children}
        </div>

        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              {visibleItems.map((item, index) => {
                const Icon = item.icon;
                const needsSeparator =
                  lastNonDestructiveIndex !== -1 &&
                  index === lastNonDestructiveIndex;

                return (
                  <div key={item.label}>
                    {needsSeparator && (
                      <div className="h-px bg-border my-2" />
                    )}
                    <button
                      onClick={() => handleItemClick(item.onClick)}
                      disabled={item.disabled}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                        item.variant === "destructive"
                          ? "text-red-600 hover:bg-red-50 active:bg-red-100"
                          : "text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                      } ${
                        item.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      <Icon className="size-5" />
                      <span className="text-base font-medium">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Use ContextMenu
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          const needsSeparator =
            lastNonDestructiveIndex !== -1 && index === lastNonDestructiveIndex;

          return (
            <div key={item.label}>
              {needsSeparator && <ContextMenuSeparator />}
              <ContextMenuItem
                onClick={item.onClick}
                disabled={item.disabled}
                className={
                  item.variant === "destructive"
                    ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                    : ""
                }
              >
                <Icon className="size-4 mr-2" />
                {item.label}
              </ContextMenuItem>
            </div>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
