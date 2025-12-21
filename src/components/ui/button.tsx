import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border/50 bg-transparent hover:bg-muted/50 text-foreground",
        secondary: "bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        ghost: "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
        highlight: "bg-highlight text-highlight-foreground shadow-sm hover:bg-highlight/90 active:scale-[0.98]",
      },
      size: {
        default: "h-8 px-3 py-1.5 [&_svg]:size-3.5",
        sm: "h-7 px-2.5 text-[11px] [&_svg]:size-3",
        lg: "h-9 px-4 text-sm [&_svg]:size-4",
        icon: "h-8 w-8 [&_svg]:size-3.5",
        "icon-sm": "h-7 w-7 [&_svg]:size-3",
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
