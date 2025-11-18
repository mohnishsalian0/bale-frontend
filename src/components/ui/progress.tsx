"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const progressRootVariants = cva(
	"relative w-full overflow-hidden rounded-full bg-gray-200",
	{
		variants: {
			size: {
				lg: "h-4",
				md: "h-2",
				sm: "h-1",
			},
		},
		defaultVariants: {
			size: "md",
		},
	}
)

const progressIndicatorVariants = cva(
	"h-full w-full flex-1 transition-all",
	{
		variants: {
			color: {
				blue: "bg-primary-500",
				yellow: "bg-yellow-500",
			},
		},
		defaultVariants: {
			color: "blue",
		},
	}
)

export interface ProgressProps
	extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, "color">,
	VariantProps<typeof progressRootVariants>,
	VariantProps<typeof progressIndicatorVariants> { }

const Progress = React.forwardRef<
	React.ElementRef<typeof ProgressPrimitive.Root>,
	ProgressProps
>(({ className, size, color, value, ...props }, ref) => (
	<ProgressPrimitive.Root
		ref={ref}
		className={cn(progressRootVariants({ size }), className)}
		{...props}
	>
		<ProgressPrimitive.Indicator
			className={progressIndicatorVariants({ color })}
			style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
		/>
	</ProgressPrimitive.Root>
))

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

