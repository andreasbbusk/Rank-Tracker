import * as React from "react";

import { cn } from "@/modules/core/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

const inputVariants = cva(
  "flex w-full rounded-md border border-black/10 bg-transparent px-3 py-1 text-base md:text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-8",
        lg: "h-10",
      },
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  ref?: React.LegacyRef<HTMLInputElement>;
}

const Input = ({
  className,
  type,
  size = "default",
  ref,
  ...props
}: InputProps) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  );
};
Input.displayName = "Input";

export { Input };
