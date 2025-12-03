interface GlowIndicatorProps {
  isActive: boolean;
  className?: string;
}

export function GlowIndicator({
  isActive,
  className = "",
}: GlowIndicatorProps) {
  return (
    <div className={className}>
      <div
        className={`size-3 rounded-full border ${
          isActive
            ? "bg-green-500 border-green-600"
            : "bg-gray-400 border-gray-500"
        }`}
        style={{
          boxShadow: isActive
            ? "0 0 12px 4px rgba(34, 197, 94, 0.6)"
            : "0 0 8px 2px rgba(156, 163, 175, 0.4)",
        }}
      />
    </div>
  );
}
