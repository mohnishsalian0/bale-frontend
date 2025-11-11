import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
	"inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default: "",
				secondary: "",
				destructive:
					"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
				outline: "",
			},
			color: {
				blue: "",
				green: "",
				orange: "",
				red: "",
				gray: "",
			},
		},
		compoundVariants: [
			// Blue variants
			{
				color: "blue",
				variant: "default",
				class: "border-transparent bg-primary-700 text-primary-100 hover:bg-blue-700/80",
			},
			{
				color: "blue",
				variant: "secondary",
				class: "border-transparent bg-primary-100 text-primary-700 hover:bg-blue-100/80",
			},
			{
				color: "blue",
				variant: "outline",
				class: "bg-transparent border-blue-700 text-blue-700 hover:bg-blue-50",
			},
			// Green variants
			{
				color: "green",
				variant: "default",
				class: "border-transparent bg-green-700 text-green-100 hover:bg-green-700/80",
			},
			{
				color: "green",
				variant: "secondary",
				class: "border-transparent bg-green-100 text-green-700 hover:bg-green-100/80",
			},
			{
				color: "green",
				variant: "outline",
				class: "bg-transparent border-green-700 text-green-700 hover:bg-green-50",
			},
			// Orange variants
			{
				color: "orange",
				variant: "default",
				class: "border-transparent bg-orange-700 text-orange-100 hover:bg-orange-700/80",
			},
			{
				color: "orange",
				variant: "secondary",
				class: "border-transparent bg-orange-100 text-orange-700 hover:bg-orange-100/80",
			},
			{
				color: "orange",
				variant: "outline",
				class: "bg-transparent border-orange-700 text-orange-700 hover:bg-orange-50",
			},
			// Red variants
			{
				color: "red",
				variant: "default",
				class: "border-transparent bg-red-700 text-red-100 hover:bg-red-700/80",
			},
			{
				color: "red",
				variant: "secondary",
				class: "border-transparent bg-red-100 text-red-700 hover:bg-red-100/80",
			},
			{
				color: "red",
				variant: "outline",
				class: "bg-transparent border-red-700 text-red-700 hover:bg-red-50",
			},
			// Gray variants
			{
				color: "gray",
				variant: "default",
				class: "border-transparent bg-gray-700 text-gray-100 hover:bg-gray-700/80",
			},
			{
				color: "gray",
				variant: "secondary",
				class: "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-100/80",
			},
			{
				color: "gray",
				variant: "outline",
				class: "bg-transparent border-gray-500 text-gray-500 hover:bg-gray-50",
			},
		],
		defaultVariants: {
			variant: "secondary",
			color: "blue",
		},
	}
)

export interface BadgeProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
	VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, color, ...props }: BadgeProps) {
	return (
		<div className={cn(badgeVariants({ variant, color }), className)} {...props} />
	)
}

export { Badge, badgeVariants }
