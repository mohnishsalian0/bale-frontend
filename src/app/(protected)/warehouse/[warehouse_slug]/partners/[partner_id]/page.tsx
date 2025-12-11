import { redirect } from "next/navigation";

export default async function PartnerRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; partner_id: string }>;
}) {
  const { warehouse_slug, partner_id } = await params;
  redirect(`/warehouse/${warehouse_slug}/partners/${partner_id}/summary`);
}
