import { redirect } from "next/navigation";

export default async function PaymentRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; payment_slug: string }>;
}) {
  const { warehouse_slug, payment_slug } = await params;
  redirect(`/warehouse/${warehouse_slug}/payments/${payment_slug}/details`);
}
