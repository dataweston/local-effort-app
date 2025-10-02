import * as React from "react";
import { cn } from "../../lib/utils";

const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";

const variantClasses = {
  default: "bg-[var(--color-accent)] text-white hover:bg-orange-600 focus-visible:ring-[var(--color-accent)]",
  secondary: "bg-slate-900 text-white hover:bg-black focus-visible:ring-slate-900",
  outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-500",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
};

const sizeClasses = {
  default: "h-10 px-4 py-2",
  lg: "h-11 px-5",
  sm: "h-9 px-3 text-sm",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef(({ className = "", variant = "default", size = "default", ...props }, ref) => {
  const variantClass = variantClasses[variant] || variantClasses.default;
  const sizeClass = sizeClasses[size] || sizeClasses.default;
  return (
    <button
      ref={ref}
      className={cn(baseClasses, variantClass, sizeClass, className)}
      {...props}
    />
  );
});
Button.displayName = "Button";
