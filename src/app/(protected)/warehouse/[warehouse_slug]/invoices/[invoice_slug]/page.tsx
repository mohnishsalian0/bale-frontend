import { redirect } from "next/navigation";

export default async function InvoiceRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; invoice_slug: string }>;
}) {
  const { warehouse_slug, invoice_slug } = await params;
  redirect(`/warehouse/${warehouse_slug}/invoices/${invoice_slug}/details`);
}
