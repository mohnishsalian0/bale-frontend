import Image from "next/image";
import { ComponentType } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const imageWrapperVariants = cva("shrink-0 object-cover", {
  variants: {
    size: {
      sm: "h-10",
      md: "h-12",
      lg: "h-16",
      xl: "h-20",
    },
    shape: {
      circle: "aspect-1/1 rounded-full",
      square: "aspect-1/1",
      rectangle: "aspect-4/3",
    },
  },
  compoundVariants: [
    { size: "sm", shape: "square", class: "rounded-md" },
    { size: "md", shape: "square", class: "rounded-lg" },
    { size: "lg", shape: "square", class: "rounded-lg" },
    { size: "xl", shape: "square", class: "rounded-xl" },
    { size: "sm", shape: "rectangle", class: "rounded-md" },
    { size: "md", shape: "rectangle", class: "rounded-lg" },
    { size: "lg", shape: "rectangle", class: "rounded-lg" },
    { size: "xl", shape: "rectangle", class: "rounded-xl" },
  ],
  defaultVariants: {
    size: "md",
    shape: "square",
  },
});

const iconVariants = cva("text-gray-400", {
  variants: {
    size: {
      sm: "size-5",
      md: "size-6",
      lg: "size-8",
      xl: "size-10",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const initialsVariants = cva("text-gray-600", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base font-medium",
      lg: "text-xl font-semibold",
      xl: "text-2xl font-semibold",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface ImageWrapperProps extends VariantProps<typeof imageWrapperVariants> {
  imageUrl?: string;
  alt: string;
  placeholderIcon?: ComponentType<{ className?: string }>;
  placeholderInitials?: string;
}

export default function ImageWrapper({
  size = "md",
  shape = "square",
  imageUrl,
  alt,
  placeholderIcon: Icon,
  placeholderInitials,
}: ImageWrapperProps) {
  // Render placeholder content (initials take priority over icon)
  const renderPlaceholder = () => {
    if (placeholderInitials) {
      return (
        <span className={initialsVariants({ size })}>
          {placeholderInitials}
        </span>
      );
    }
    if (Icon) {
      return <Icon className={iconVariants({ size })} />;
    }
    return null;
  };

  if (imageUrl) {
    return (
      <div
        className={cn(
          imageWrapperVariants({ size, shape }),
          "relative overflow-hidden",
        )}
      >
        <Image src={imageUrl} alt={alt} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        imageWrapperVariants({ size, shape }),
        "bg-gray-100 flex items-center justify-center",
      )}
    >
      {renderPlaceholder()}
    </div>
  );
}
