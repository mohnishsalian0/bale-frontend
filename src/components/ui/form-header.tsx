import { IconX } from "@tabler/icons-react";
import { Button } from "./button";

interface FormHeaderProps {
  title: string;
  currentStep: number;
  totalSteps: number;
  onCancel: () => void;
  disableCancel: boolean;
}

export default function FormHeader({
  title,
  currentStep,
  totalSteps,
  onCancel,
  disableCancel,
}: FormHeaderProps) {
  return (
    <div className="shrink-0 border-b border-gray-200 bg-background">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={disableCancel}
        >
          <IconX className="size-5" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className={`h-full bg-primary-500 transition-all duration-300`}
          style={{ width: `${Math.round((currentStep * 100) / totalSteps)}%` }}
        />
      </div>
    </div>
  );
}
