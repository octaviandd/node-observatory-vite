import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils.js"

const badgeVariants = cva(
  "inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80 text-white",
        outline: "text-foreground",
        success: "border-transparent bg-green-500 text-white shadow-sm hover:bg-green-600",
        warning: "border-transparent bg-yellow-500 text-white shadow-sm hover:bg-yellow-600",
        error: "border-transparent bg-red-500 text-white shadow-sm hover:bg-red-600",
        debug: "border-transparent bg-blue-500 text-white shadow-sm hover:bg-blue-600",
        trace: "border-transparent bg-teal-500 text-white shadow-sm hover:bg-teal-600",
        log: "border-transparent bg-gray-500 text-white shadow-sm hover:bg-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
