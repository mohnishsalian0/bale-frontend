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
    <div className="min-h-dvh relative flex flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-md">
        <div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
}
