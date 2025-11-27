import { ReactNode } from "react";
import Image from "next/image";
import { getCompanyBySlug } from "@/lib/queries/catalog";
import { CartProvider } from "@/contexts/cart-context";
import { notFound } from "next/navigation";

interface StoreLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        {/* Header with company logo and name */}
        <header className="border-b border-border bg-background sticky top-0 z-50">
          <div className="container max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            {company.logo_url ? (
              <div className="relative size-8 shrink-0">
                <Image
                  src={company.logo_url}
                  alt={company.name}
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="size-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-lg font-medium text-gray-900">
              {company.name}
            </h1>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </CartProvider>
  );
}
