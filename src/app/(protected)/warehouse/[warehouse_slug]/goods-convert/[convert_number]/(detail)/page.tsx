import { redirect } from "next/navigation";

export default async function GoodsConvertRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; convert_number: string }>;
}) {
  const { warehouse_slug, convert_number } = await params;
  redirect(
    `/warehouse/${warehouse_slug}/goods-convert/${convert_number}/details`,
  );
}
