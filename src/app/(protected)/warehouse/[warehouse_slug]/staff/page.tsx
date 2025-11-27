"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Fab } from "@/components/ui/fab";
import { TabPills } from "@/components/ui/tab-pills";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { AddStaffSheet } from "./AddStaffSheet";
import { StaffMembersTab } from "./StaffMembersTab";
import { ActiveInvitesTab } from "./ActiveInvitesTab";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database/enums";

interface StaffMember {
  id: string;
  name: string;
  phoneNumber: string | null;
  role: UserRole;
  warehouseNames: string[];
  profileImageUrl: string | null;
}

interface ActiveInvite {
  id: string;
  role: UserRole;
  warehouseNames: string[];
  companyName: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "invites">("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<ActiveInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);

  const supabase = createClient();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: usersData, error: fetchError } = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, phone_number, profile_image_url, role",
        )
        .order("first_name", { ascending: true });

      if (fetchError) throw fetchError;

      // Fetch warehouse assignments for each user
      const staffWithWarehouses = await Promise.all(
        (usersData || []).map(async (user: any) => {
          const { data: userWarehouses } = await supabase
            .from("user_warehouses")
            .select(
              `
							warehouses (name)
						`,
            )
            .eq("user_id", user.id);

          const warehouseNames = (userWarehouses || [])
            .map((uw: any) => uw.warehouses?.name)
            .filter(Boolean);

          return {
            id: user.id,
            name: `${user.first_name} ${user.last_name}`.trim(),
            phoneNumber: user.phone_number,
            warehouseNames,
            profileImageUrl: user.profile_image_url,
            role: user.role,
          };
        }),
      );

      setStaff(staffWithWarehouses);
    } catch (err) {
      console.error("Error fetching staff:", err);
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: invitesData, error: fetchError } = await supabase
        .from("invites")
        .select("*")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch warehouse names for each invite
      const invitesWithWarehouses = await Promise.all(
        (invitesData || []).map(async (invite: any) => {
          const { data: inviteWarehouses } = await supabase
            .from("invite_warehouses")
            .select(
              `
							warehouses (name)
						`,
            )
            .eq("invite_id", invite.id);

          const warehouseNames = (inviteWarehouses || [])
            .map((iw: any) => iw.warehouses?.name)
            .filter(Boolean);

          return {
            id: invite.id,
            role: invite.role,
            warehouseNames,
            companyName: invite.company_name,
            token: invite.token,
            expiresAt: invite.expires_at,
            createdAt: invite.created_at,
          };
        }),
      );

      setInvites(invitesWithWarehouses);
    } catch (err) {
      console.error("Error fetching invites:", err);
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "staff") {
      fetchStaff();
    } else {
      fetchInvites();
    }
  }, [activeTab]);

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
        message={error}
        onRetry={() => window.location.reload()}
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
      {activeTab === "invites" && (
        <ActiveInvitesTab invites={invites} onInviteDeleted={fetchInvites} />
      )}

      {/* Floating Action Button */}
      <Fab
        onClick={() => setShowAddStaff(true)}
        className="fixed bottom-20 right-4"
      />

      {/* Add Staff Sheet */}
      {showAddStaff && (
        <AddStaffSheet
          open={showAddStaff}
          onOpenChange={setShowAddStaff}
          onStaffAdded={() => {
            // Refresh invites when a new invite is created
            if (activeTab === "invites") {
              fetchInvites();
            }
          }}
        />
      )}
    </div>
  );
}
