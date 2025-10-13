import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-lg text-sm font-normal transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-6 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary-700 text-white shadow-[0px_4px_0px_0px_rgb(11,74,111)] hover:bg-primary-800 active:shadow-[0px_2px_0px_0px_rgb(11,74,111)] active:translate-y-[2px]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0px_4px_0px_0px_rgb(185,28,28)] hover:bg-destructive/90 active:shadow-[0px_2px_0px_0px_rgb(185,28,28)] active:translate-y-[2px]",
        outline:
          "border border-input bg-background shadow-[0px_4px_0px_0px_rgb(229,229,229)] hover:bg-accent hover:text-accent-foreground active:shadow-[0px_2px_0px_0px_rgb(229,229,229)] active:translate-y-[2px]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0px_4px_0px_0px_rgb(2,106,162)] hover:bg-secondary/80 active:shadow-[0px_2px_0px_0px_rgb(2,106,162)] active:translate-y-[2px]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-lg px-6",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
