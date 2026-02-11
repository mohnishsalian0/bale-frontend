import { redirect } from "next/navigation";

export default async function GoodsTransferRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; transfer_number: string }>;
}) {
  const { warehouse_slug, transfer_number } = await params;
  redirect(
    `/warehouse/${warehouse_slug}/goods-transfer/${transfer_number}/details`,
  );
}
