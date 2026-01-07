import { redirect } from "next/navigation";

export default async function AdjustmentNoteRedirectPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; adjustment_slug: string }>;
}) {
  const { warehouse_slug, adjustment_slug } = await params;
  redirect(
    `/warehouse/${warehouse_slug}/adjustment-notes/${adjustment_slug}/details`,
  );
}
