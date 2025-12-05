import { cva } from "class-variance-authority";

const variants = cva("rounded-full border", {
  variants: {
    size: {
      sm: "size-1.5",
      md: "size-3",
    },
    isActive: {
      false: "bg-gray-400 border-gray-500/60",
      true: "bg-green-500 border-green-600/80",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface GlowIndicatorProps {
  isActive: boolean;
  size: "sm" | "md";
  className?: string;
}

export function GlowIndicator({
  isActive,
  size,
  className = "",
}: GlowIndicatorProps) {
  return (
    <div className={className}>
      <div
        className={variants({ size, isActive })}
        style={{
          boxShadow: isActive
            ? size === "sm"
              ? "0 0 8px 2px rgba(34, 197, 94, 0.6)"
              : "0 0 12px 4px rgba(34, 197, 94, 0.6)"
            : "",
        }}
      />
    </div>
  );
}
