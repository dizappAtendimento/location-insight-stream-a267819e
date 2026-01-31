import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium ring-offset-background transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-highlight text-highlight-foreground shadow-sm shadow-highlight/10 hover:bg-highlight/90 hover:shadow-md hover:shadow-highlight/15 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline: "border border-border/50 bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground hover:border-border/70",
        secondary: "bg-muted/50 text-foreground hover:bg-muted/70 border border-transparent hover:border-border/30",
        ghost: "hover:bg-muted/40 text-muted-foreground hover:text-foreground",
        link: "text-highlight underline-offset-4 hover:underline p-0 h-auto",
        highlight: "bg-highlight text-highlight-foreground shadow-sm shadow-highlight/10 hover:bg-highlight/90 hover:shadow-md hover:shadow-highlight/15 active:scale-[0.98]",
        premium: "bg-gradient-to-r from-highlight to-highlight/80 text-highlight-foreground shadow-md shadow-highlight/20 hover:shadow-lg hover:shadow-highlight/25 active:scale-[0.98]",
      },
      size: {
        default: "h-8 px-3.5 py-1.5 [&_svg]:size-3.5",
        sm: "h-7 px-2.5 text-[11px] [&_svg]:size-3",
        lg: "h-10 px-5 text-sm [&_svg]:size-4",
        icon: "h-8 w-8 [&_svg]:size-3.5",
        "icon-sm": "h-7 w-7 [&_svg]:size-3",
        "icon-lg": "h-10 w-10 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };