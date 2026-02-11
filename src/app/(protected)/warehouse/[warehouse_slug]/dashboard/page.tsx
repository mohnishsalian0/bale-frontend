"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";

export default function DashboardPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const redirectPath = `/warehouse/${warehouse.slug}/inventory`;

  return (
    <ErrorState
      title="Work in progress"
      message="This page is under construction"
      actionText="Go home"
      onRetry={() => router.push(redirectPath)}
    />
  );
}
