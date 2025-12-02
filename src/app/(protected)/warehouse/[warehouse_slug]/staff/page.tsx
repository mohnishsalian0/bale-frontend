"use client";

import { useState } from "react";
import Image from "next/image";
import { Fab } from "@/components/ui/fab";
import { TabPills } from "@/components/ui/tab-pills";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { InviteFormSheet } from "./InviteFormSheet";
import { StaffMembersTab } from "./StaffMembersTab";
import { ActiveInvitesTab } from "./ActiveInvitesTab";
import { useStaffMembers } from "@/lib/query/hooks/users";
import { useActiveInvites } from "@/lib/query/hooks/invites";

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "invites">("staff");
  const [showCreateInvite, setShowCreateInvite] = useState(false);

  // Fetch data using hooks
  const {
    data: staff = [],
    isLoading: staffLoading,
    error: staffError,
    refetch: refetchStaff,
  } = useStaffMembers();

  const {
    data: invites = [],
    isLoading: invitesLoading,
    error: invitesError,
    refetch: refetchInvites,
  } = useActiveInvites();

  // Determine current loading/error state based on active tab
  const loading = activeTab === "staff" ? staffLoading : invitesLoading;
  const error = activeTab === "staff" ? staffError : invitesError;

  // Loading state
  if (loading) {
    return (
      <LoadingState
        message={
          activeTab === "staff" ? "Loading staff..." : "Loading invites..."
        }
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title={
          activeTab === "staff"
            ? "Failed to load staff"
            : "Failed to load invites"
        }
        message={error.message}
        onRetry={() => {
          if (activeTab === "staff") {
            void refetchStaff();
          } else {
            void refetchInvites();
          }
        }}
      />
    );
  }

  return (
    <div className="relative flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 p-4">
        <h1 className="text-3xl font-bold text-gray-900">Staff</h1>

        {/* Mascot */}
        <div className="relative size-24 shrink-0">
          <Image
            src="/mascot/staff-trolley.png"
            alt="Staff"
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2">
        <TabPills
          options={[
            { value: "staff", label: "Staff Members" },
            { value: "invites", label: "Active Invites" },
          ]}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "staff" | "invites")}
        />
      </div>

      {/* Staff Cards Grid */}
      {activeTab === "staff" && <StaffMembersTab staff={staff} />}

      {/* Active Invites Grid */}
      {activeTab === "invites" && <ActiveInvitesTab invites={invites} />}

      {/* Floating Action Button */}
      <Fab
        onClick={() => setShowCreateInvite(true)}
        className="fixed bottom-20 right-4"
      />

      {/* Add Staff Sheet */}
      {showCreateInvite && (
        <InviteFormSheet
          open={showCreateInvite}
          onOpenChange={setShowCreateInvite}
        />
      )}
    </div>
  );
}
