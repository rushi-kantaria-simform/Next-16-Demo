import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Note: no "use client" here.
 *
 * This component has no state and no event handlers of its own, so it stays a
 * Server Component and ships zero JS. A Client Component can still import and
 * render it — and attach its own `onClick`, because that handler is defined on
 * the client side of the boundary.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  secondary:
    "bg-surface-raised text-content border border-line hover:bg-surface-muted",
  ghost: "text-content hover:bg-surface-muted",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      // Defaulting to type="button" matters: inside a <form>, an untyped
      // button defaults to type="submit" and will submit on any click.
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
