"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RestrictedAccessProps {
  message?: string;
}

export function RestrictedAccess({
  message = "You do not have permission to access this page.",
}: RestrictedAccessProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.back();
  };

  return (
    <div className="min-h-dvh relative flex flex-col items-center justify-center gap-12">
      <Image
        src="/mascot/restricted-zone.png"
        alt="Restricted Access"
        width={250}
        height={250}
        priority
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-gray-700">
          Access Restricted
        </h1>
        <i className="text-lg font-light text-gray-500">{message}</i>
      </div>
      <Button onClick={handleGoHome} size="lg" className="mt-4">
        Go Back
      </Button>
    </div>
  );
}
