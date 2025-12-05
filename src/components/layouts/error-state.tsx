import Image from "next/image";
import { Button } from "../ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionText?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  actionText = "Reload page",
}: ErrorStateProps) {
  return (
    <div className="min-h-dvh relative flex flex-col items-center justify-center gap-8 p-4">
      <Image
        src="/mascot/mascot-server-repair.png"
        alt="Error"
        width={200}
        height={200}
        priority
      />
      <div className="w-full flex flex-col items-center">
        <h2 className="text-xl font-semibold text-gray-900 text-center">
          {title}
        </h2>
        <p className="text-sm text-gray-500 text-center mt-1">{message}</p>
        {onRetry && (
          <Button className="mx-auto mt-4" onClick={onRetry}>
            {actionText}
          </Button>
        )}
      </div>
    </div>
  );
}
