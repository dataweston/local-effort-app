import * as React from "react";
import { cn } from "../../lib/utils";

export const Label = React.forwardRef(({ className = "", children, ...props }, ref) => (
  <label ref={ref} className={cn("text-sm font-semibold text-slate-700", className)} {...props}>
    {children}
  </label>
));
Label.displayName = "Label";
