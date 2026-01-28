"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

interface RadioGroupItemProps {
  value: string;
  title: string;
  subtitle: string;
  className?: string;
}

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  name: string;
  disabled?: boolean;
} | null>(null);

function RadioGroup({
  value,
  onValueChange,
  name,
  className,
  children,
  disabled,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider
      value={{ value, onValueChange, name, disabled }}
    >
      <div
        className={cn("grid grid-cols-2 gap-3", className)}
        role="radiogroup"
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

function RadioGroupItem({
  value,
  title,
  subtitle,
  className,
}: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext);

  if (!context) {
    throw new Error("RadioGroupItem must be used within RadioGroup");
  }

  const isSelected = context.value === value;
  const isDisabled = context.disabled;
  const id = `${context.name}-${value}`;

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex flex-col gap-1 p-4 rounded-lg border-2 transition-colors",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        isSelected
          ? "bg-primary-100 border-primary-500"
          : "bg-background-100 border-gray-200",
        className,
      )}
    >
      <input
        type="radio"
        id={id}
        name={context.name}
        value={value}
        checked={isSelected}
        onChange={(e) => !isDisabled && context.onValueChange(e.target.value)}
        disabled={isDisabled}
        className="sr-only"
      />
      <span className="text-sm font-medium text-gray-700">{title}</span>
      <span className="text-xs text-gray-700">{subtitle}</span>
    </label>
  );
}

export { RadioGroup, RadioGroupItem };
