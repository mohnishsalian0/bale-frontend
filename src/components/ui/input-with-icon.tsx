import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { Label } from "./label";

export interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, icon, label, required, ...props }, ref) => {
    return (
      <div className={cn("relative", className)}>
        {label && (
          <Label htmlFor={label} className="pl-1 mb-1.5" required={required}>
            {label}
          </Label>
        )}
        <div>
          <div className="absolute flex justify-center items-center left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500">
            {icon}
          </div>
          <Input
            id={label}
            required={required}
            ref={ref}
            className={`${label ?? "pl-12"}`}
            {...props}
          />
        </div>
      </div>
    );
  },
);

InputWithIcon.displayName = "InputWithIcon";

export { InputWithIcon };
