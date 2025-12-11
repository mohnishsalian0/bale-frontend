import { redirect } from "next/navigation";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    product_number: string;
  }>;
}

export default async function ProductDetailPage({ params }: PageParams) {
  const { warehouse_slug, product_number } = await params;
  redirect(`/warehouse/${warehouse_slug}/inventory/${product_number}/summary`);
}
