import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-[11px] font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-highlight/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-highlight text-highlight-foreground shadow-sm hover:bg-highlight/90 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border/40 bg-transparent hover:bg-muted/40 text-muted-foreground hover:text-foreground",
        secondary: "bg-muted/50 text-foreground hover:bg-muted/70",
        ghost: "hover:bg-muted/40 text-muted-foreground hover:text-foreground",
        link: "text-highlight underline-offset-4 hover:underline p-0 h-auto",
        highlight: "bg-highlight text-highlight-foreground shadow-sm hover:bg-highlight/90 active:scale-[0.98]",
      },
      size: {
        default: "h-7 px-2.5 py-1 [&_svg]:size-3",
        sm: "h-6 px-2 text-[10px] [&_svg]:size-2.5",
        lg: "h-8 px-3.5 text-xs [&_svg]:size-3.5",
        icon: "h-7 w-7 [&_svg]:size-3",
        "icon-sm": "h-6 w-6 [&_svg]:size-2.5",
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
