import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";
import type { ContextMenuItem } from "@/lib/utils/context-menu-items";

interface ActionsFooterProps {
  items: ContextMenuItem[];
  dropdownAlign?: "start" | "end";
  dropdownSide?: "top" | "bottom";
}

export function ActionsFooter({
  items,
  dropdownAlign = "start",
  dropdownSide = "top",
}: ActionsFooterProps) {
  // Filter out hidden items
  const visibleItems = items.filter((item) => !item.hidden);

  // Determine which items go where
  const primaryButton = visibleItems[0] || null;
  const secondaryButton = visibleItems[1] || null;
  const dropdownItems = visibleItems.slice(2);

  // Check if we need to show the dropdown
  const showDropdown = dropdownItems.length > 0;

  return (
    <div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
      {/* 3-dots dropdown menu */}
      {showDropdown && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm">
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={dropdownAlign}
            side={dropdownSide}
            sideOffset={8}
          >
            {dropdownItems.map((item, index) => {
              const Icon = item.icon;
              const isDestructive = item.variant === "destructive";
              const showSeparator =
                index < dropdownItems.length - 1 &&
                isDestructive !==
                  (dropdownItems[index + 1]?.variant === "destructive");

              return (
                <div key={index}>
                  <DropdownMenuItem
                    onClick={item.onClick}
                    disabled={item.disabled}
                    variant={
                      item.variant === "destructive" ? "destructive" : undefined
                    }
                  >
                    <Icon />
                    {item.label}
                  </DropdownMenuItem>
                  {showSeparator && <DropdownMenuSeparator />}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Secondary button (second item, flex-1) */}
      {secondaryButton && (
        <Button
          size={secondaryButton.size || "sm"}
          variant={secondaryButton.variant || "outline"}
          onClick={secondaryButton.onClick}
          disabled={secondaryButton.disabled}
          className="flex-1"
        >
          {secondaryButton.content || secondaryButton.label}
        </Button>
      )}

      {/* Primary button (first item, flex-2) */}
      {primaryButton && (
        <Button
          size={primaryButton.size || "sm"}
          variant={primaryButton.variant || "default"}
          onClick={primaryButton.onClick}
          disabled={primaryButton.disabled}
          className="flex-2"
        >
          {primaryButton.content ? (
            primaryButton.content
          ) : (
            <>
              <primaryButton.icon className="size-5" />
              {primaryButton.label}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
