import { redirect } from 'next/navigation';

export default async function SalesOrderRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; order_number: string }>;
}) {
  const { warehouse_slug, order_number } = await params;
  redirect(
    `/warehouse/${warehouse_slug}/sales-orders/${order_number}/details`,
  );
}
