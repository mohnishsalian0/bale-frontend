import { redirect } from 'next/navigation';

export default function SalesOrderRedirectPage({
  params,
}: {
  params: { warehouse_slug: string; order_number: string };
}) {
  const { warehouse_slug, order_number } = params;
  redirect(
    `/warehouse/${warehouse_slug}/sales-orders/${order_number}/details`,
  );
}
