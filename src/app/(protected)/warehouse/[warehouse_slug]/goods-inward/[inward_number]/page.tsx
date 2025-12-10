import { redirect } from 'next/navigation';

export default async function GoodsInwardRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; inward_number: string }>;
}) {
  const { warehouse_slug, inward_number } = await params;
  redirect(
    `/warehouse/${warehouse_slug}/goods-inward/${inward_number}/details`,
  );
}
