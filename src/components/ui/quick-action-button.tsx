"use client";

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface QuickActionButtonProps {
  action: QuickAction;
  onClick: () => void;
}

export function QuickActionButton({ action, onClick }: QuickActionButtonProps) {
  const Icon = action.icon;
  return (
    <button
      onClick={onClick}
      className="max-w-30 flex flex-col items-center gap-2 p-3 rounded-xl text-gray-700 hover:bg-primary-500 hover:text-white transition-colors cursor-pointer"
    >
      <div className="h-12 min-w-12 px-3 rounded-xl bg-primary-500 flex items-center justify-center">
        <Icon className="h-6 text-white" />
      </div>
      <span className="text-sm leading-[1.5] text-center">{action.label}</span>
    </button>
  );
}

export type { QuickAction };
