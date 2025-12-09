"use client";

import { useState } from "react";
import {
  IconBrandWhatsapp,
  IconCopy,
  IconTrash,
  IconClock,
  IconMail,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatExpiryDate } from "@/lib/utils/date";
import { toast } from "sonner";
import { RoleBadge } from "@/components/ui/role-badge";
import type { InviteListView } from "@/types/invites.types";
import { useInviteMutations } from "@/lib/query/hooks/invites";
import { UserRole } from "@/types/database/enums";

interface ActiveInvitesTabProps {
  invites: InviteListView[];
}

export function ActiveInvitesTab({ invites }: ActiveInvitesTabProps) {
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const { delete: deleteInvite } = useInviteMutations();

  const handleShareWhatsApp = (invite: InviteListView) => {
    const inviteUrl = `${window.location.origin}/invite/${invite.token}`;
    const systemDescription = invite.all_warehouses_access
      ? "our inventory system with access to all warehouses"
      : (() => {
          const warehouseText =
            invite.warehouse_names.length > 0
              ? invite.warehouse_names.join(", ")
              : "";
          return warehouseText
            ? `${warehouseText} inventory system`
            : "our inventory system";
        })();

    const whatsappMessage = `Hi,

You've been invited to join ${invite.company_name} and get access to ${systemDescription} as ${invite.role === "admin" ? "Admin" : "Staff"}.

Here's your invite link:
🔗 ${inviteUrl}

📅 Please note: This link is valid for 7 days.

We're excited to have you onboard with us!

Thanks,
The Bale Team`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const handleCopyLink = async (token: string) => {
    try {
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy link");
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingInviteId(id);
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteInvite.mutateAsync(id, {
      onSuccess: () => {
        toast.success("Invite revoked successfully");
        setDeletingInviteId(null);
      },
      onError: (error) => {
        console.error("Error revoking invite:", error);
        toast.error("Failed to revoke invite");
        setDeletingInviteId(null);
      },
    });
  };

  const handleCancelDelete = () => {
    setDeletingInviteId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      {invites.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-600 mb-2">No active invites</p>
          <p className="text-sm text-gray-500">
            Create a new invite to get started
          </p>
        </div>
      ) : (
        invites.map((invite) => {
          const expiry = formatExpiryDate(invite.expires_at);
          return (
            <Card key={invite.id}>
              <CardContent className="p-4 flex flex-col gap-6 h-full">
                {/* Top Row: Icon, Info, Badge */}
                <div className="flex gap-3 items-start w-full">
                  {/* Mail Icon */}
                  <div className="relative size-12 rounded-lg shrink-0 bg-gray-100 overflow-hidden">
                    <div className="flex items-center justify-center size-full">
                      <IconMail className="size-6 text-gray-400" />
                    </div>
                  </div>

                  {/* Warehouse & Expiry Info */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    {/* Warehouse info */}
                    {invite.all_warehouses_access ? (
                      <p className="text-gray-700 font-medium">
                        All warehouses
                      </p>
                    ) : invite.warehouse_names.length > 0 ? (
                      <p
                        title={invite.warehouse_names.join(", ")}
                        className="text-gray-700 truncate font-medium"
                      >
                        {invite.warehouse_names.length === 1
                          ? invite.warehouse_names[0]
                          : `${invite.warehouse_names[0]}, +${invite.warehouse_names.length - 1} more`}
                      </p>
                    ) : (
                      <p className="text-gray-700 font-medium">
                        {invite.company_name}
                      </p>
                    )}

                    {/* Expiry */}
                    <div className="flex gap-1.5 items-center">
                      <IconClock className="size-4 shrink-0 text-gray-500" />
                      <p
                        className={`text-sm ${
                          expiry.status === "expired"
                            ? "text-red-600"
                            : expiry.status === "urgent"
                              ? "text-orange-600"
                              : "text-gray-500"
                        }`}
                      >
                        {expiry.text}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <RoleBadge role={invite.role as UserRole} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 w-full">
                  {deletingInviteId === invite.id ? (
                    <>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={handleCancelDelete}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 hover:bg-red-200 hover:text-red-700"
                        onClick={() => handleConfirmDelete(invite.id)}
                      >
                        Confirm delete
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => handleShareWhatsApp(invite)}
                      >
                        <IconBrandWhatsapp />
                        Share on WhatsApp
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Copy invite link"
                        onClick={() => handleCopyLink(invite.token)}
                      >
                        <IconCopy />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-red-200 hover:text-red-700"
                        onClick={() => handleDeleteClick(invite.id)}
                      >
                        <IconTrash />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
