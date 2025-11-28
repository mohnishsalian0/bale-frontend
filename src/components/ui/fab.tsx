import * as React from "react";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Additional className for the button
   */
  className?: string;
  /**
   * Icon component to display (defaults to IconPlus)
   */
  icon?: React.ComponentType<{ className?: string }>;
}

const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ className, icon: IconComponent = IconPlus, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        className={cn(
          "z-40 size-14 rounded-full shadow-none border-shadow-primary active:border-none",
          className,
        )}
        {...props}
      >
        <IconComponent className="size-6 text-base-white" />
      </Button>
    );
  },
);

Fab.displayName = "Fab";

export { Fab };
