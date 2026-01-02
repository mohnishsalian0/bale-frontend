"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";
import type { ContextMenuItem } from "@/lib/utils/action-menu";

interface CardActionsProps {
  items: ContextMenuItem[];
  maxVisibleActions?: number;
  size?: "sm" | "default";
}

/**
 * Reusable component for rendering action buttons inside cards
 * Similar to ActionsFooter but optimized for card contexts
 * - Renders first N items as ghost buttons
 * - Remaining items in dropdown menu
 * - Filters out hidden items
 */
export function CardActions({
  items,
  maxVisibleActions = 2,
  size = "sm",
}: CardActionsProps) {
  // Filter out hidden items
  const visibleItems = items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) {
    return null;
  }

  // Split items: first N as buttons, rest in dropdown
  const buttonItems = visibleItems.slice(0, maxVisibleActions);
  const dropdownItems = visibleItems.slice(maxVisibleActions);

  return (
    <div className="flex items-center gap-1">
      {/* Render first N items as ghost buttons */}
      {buttonItems.map((item, index) => (
        <Button
          key={index}
          variant="ghost"
          size={size}
          onClick={item.onClick}
          disabled={item.disabled}
        >
          {item.content || (
            <>
              <item.icon />
              {item.label}
            </>
          )}
        </Button>
      ))}

      {/* Dropdown menu for remaining items */}
      {dropdownItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon-sm">
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {dropdownItems.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                }}
                disabled={item.disabled}
              >
                {item.content || (
                  <>
                    <item.icon />
                    {item.label}
                  </>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
