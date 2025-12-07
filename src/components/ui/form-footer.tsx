import { ReactNode } from "react";

interface FormFooterProps {
  children: ReactNode;
}

export default function FormFooter({ children }: FormFooterProps) {
  return (
    <div className="border-t border-gray-200 p-4 flex gap-3 bg-background">
      {children}
    </div>
  );
}
