import { redirect } from 'next/navigation';

export default async function GoodsOutwardRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; outward_number: string }>;
}) {
  const { warehouse_slug, outward_number } = await params;
  redirect(
    `/warehouse/${warehouse_slug}/goods-outward/${outward_number}/details`,
  );
}
