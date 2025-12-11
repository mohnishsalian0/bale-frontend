import { redirect } from 'next/navigation';

export default async function PurchaseOrderRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; purchase_number: string }>;
}) {
  const { warehouse_slug, purchase_number } = await params;
  redirect(
    `/warehouse/${warehouse_slug}/purchase-orders/${purchase_number}/details`,
  );
}
