import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { Suspense } from "react";
import { QueryProvider } from "@/lib/query/provider";

export const metadata: Metadata = {
  title: "Bale - Fabric Inventory Management",
  description: "Inventory management system for fabric distributors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <Toaster position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
