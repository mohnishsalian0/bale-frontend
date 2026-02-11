import { redirect } from "next/navigation";

export default async function GoodsMovementPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string }>;
}) {
  const { warehouse_slug } = await params;
  redirect(`/warehouse/${warehouse_slug}/goods-movement/inward`);
}
