import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";

export const metadata: Metadata = {
  title: "Bale - Fabric Inventory Management",
  description: "Inventory management system for fabric distributors",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="overflow-y-hidden">
        <QueryProvider>
          {children}
          <Toaster position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
