import { redirect } from "next/navigation";

export default async function SalesOrderRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; sale_number: string }>;
}) {
  const { warehouse_slug, sale_number } = await params;
  redirect(`/warehouse/${warehouse_slug}/sales-orders/${sale_number}/details`);
}
