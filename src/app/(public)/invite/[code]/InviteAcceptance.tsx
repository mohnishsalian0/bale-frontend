"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Image from "next/image";
import {
  IconBrandGoogleFilled,
  IconBuildingWarehouse,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InviteAcceptanceProps {
  inviteCode: string;
  companyName: string;
  warehouseName?: string;
  role: string;
}

export default function InviteAcceptance({
  inviteCode,
  companyName,
  warehouseName,
  role,
}: InviteAcceptanceProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Initiate Google OAuth - redirect to callback with invite code
      const callbackUrl = `${window.location.origin}/auth/callback?invite_code=${inviteCode}`;

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (authError) {
        throw authError;
      }

      // OAuth redirect will happen automatically
    } catch (err: any) {
      console.error("Error accepting invite:", err);
      setError(err.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  // Get company initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 pt-8">
      <div className="w-full max-w-[380px] flex flex-col gap-8 items-center">
        {/* Mascot Image */}
        <div className="relative size-70 shrink-0">
          <Image
            src="/mascot/welcome.png"
            alt="Welcome mascot"
            fill
            sizes="500px"
            className="object-contain"
            priority
          />
        </div>

        {/* Welcome Message */}
        <div className="text-center flex flex-col gap-1 w-full">
          <h1 className="text-3xl font-semibold text-gray-700">
            Welcome fabric trader!
          </h1>
          <p className="text-base italic text-gray-500">
            I'm here to help you experience a smarter, newer & next generation
            inventory solution.
          </p>
        </div>

        {/* Registration Info */}
        <div className="flex flex-col gap-1 w-full">
          <p className="text-sm text-gray-500">You are registering with...</p>
          <div className="bg-background-100 border-2 border-gray-200 rounded-2xl p-4 flex gap-3 items-start">
            {/* Company Avatar */}
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
              <span className="text-lg font-medium text-gray-700">
                {getInitials(companyName)}
              </span>
            </div>

            {/* Company & Warehouse Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <p className="text-base font-medium text-gray-900">
                {companyName}
              </p>
              <div className="flex items-center gap-1.5 text-gray-500">
                <IconBuildingWarehouse className="w-4 h-4" />
                <span className="text-sm font-normal">
                  {warehouseName ? warehouseName : "All warehouses"}
                </span>
              </div>
            </div>

            {/* Role Badge */}
            <Badge color={role === "admin" ? "blue" : "green"}>
              {role === "admin" ? "Admin" : "Staff"}
            </Badge>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Register Button */}
        <Button onClick={handleAccept} disabled={loading} className="w-full">
          {loading ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Registering...</span>
            </>
          ) : (
            <>
              <IconBrandGoogleFilled className="w-6 h-6 text-white" />
              <span>Register with Google</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
