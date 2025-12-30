import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { Label } from "./label";

export interface InputWrapperProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightText?: string;
  required?: boolean;
  isError?: boolean;
  errorText?: string;
  helpText?: string;
}

const InputWrapper = React.forwardRef<HTMLInputElement, InputWrapperProps>(
  (
    {
      className,
      icon,
      rightText,
      label,
      required,
      isError,
      errorText,
      helpText,
      ...props
    },
    ref,
  ) => {
    return (
      <div className={cn("relative", className)}>
        {label && (
          <Label htmlFor={label} className="pl-1 mb-1.5" required={required}>
            {label}
          </Label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute flex justify-center items-center left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-500">
              {icon}
            </div>
          )}
          <Input
            id={label}
            required={required}
            ref={ref}
            className={cn(
              `${icon && "pl-9"} ${rightText && "pr-9"}`,
              isError && "border-red-500",
            )}
            {...props}
          />
          {rightText && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              {rightText}
            </span>
          )}
        </div>
        {isError && errorText ? (
          <p className="text-xs text-red-500 mt-1 pl-1">{errorText}</p>
        ) : helpText ? (
          <p className="text-xs text-gray-500 mt-1 pl-1">{helpText}</p>
        ) : null}
      </div>
    );
  },
);

InputWrapper.displayName = "InputWrapper";

export { InputWrapper };
