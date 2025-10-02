import * as React from "react";
import { cn } from "../../lib/utils";

export const Card = React.forwardRef(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}
    {...props}
  >
    {children}
  </div>
));
Card.displayName = "Card";

export const CardHeader = ({ className = "", children, ...props }) => (
  <div className={cn("space-y-1.5 border-b border-slate-100 px-6 py-5", className)} {...props}>
    {children}
  </div>
);
CardHeader.displayName = "CardHeader";

export const CardTitle = ({ className = "", children, ...props }) => (
  <h3 className={cn("text-lg font-semibold text-slate-900", className)} {...props}>
    {children}
  </h3>
);
CardTitle.displayName = "CardTitle";

export const CardDescription = ({ className = "", children, ...props }) => (
  <p className={cn("text-sm text-slate-500", className)} {...props}>
    {children}
  </p>
);
CardDescription.displayName = "CardDescription";

export const CardContent = ({ className = "", children, ...props }) => (
  <div className={cn("px-6 py-5", className)} {...props}>
    {children}
  </div>
);
CardContent.displayName = "CardContent";

export const CardFooter = ({ className = "", children, ...props }) => (
  <div className={cn("flex items-center gap-3 px-6 py-4 border-t border-slate-100", className)} {...props}>
    {children}
  </div>
);
CardFooter.displayName = "CardFooter";
