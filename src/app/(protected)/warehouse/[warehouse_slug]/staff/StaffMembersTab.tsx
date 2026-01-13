"use client";

import { IconBuilding, IconPhone, IconEdit } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getInitials } from "@/lib/utils/initials";
import { RoleBadge } from "@/components/ui/role-badge";
import type { StaffListView } from "@/types/staff.types";

interface StaffMembersTabProps {
  staff: StaffListView[];
  currentUserId: string;
  onEdit: (member: StaffListView) => void;
}

export function StaffMembersTab({
  staff,
  currentUserId,
  onEdit,
}: StaffMembersTabProps) {
  return (
    <li className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-4 items-stretch p-4">
      {staff.length === 0 ? (
        <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-600 mb-2">No staff members found</p>
          <p className="text-sm text-gray-500">Add your first staff member</p>
        </div>
      ) : (
        staff.map((member) => {
          const fullName = `${member.first_name} ${member.last_name}`.trim();
          return (
            <ul key={member.id}>
              <Card className="min-h-40">
                <CardContent className="relative p-4 flex flex-col gap-3 items-center h-full">
                  {/* Avatar */}
                  <ImageWrapper
                    size="lg"
                    shape="circle"
                    imageUrl={member.profile_image_url || undefined}
                    alt={fullName}
                    placeholderInitials={getInitials(fullName)}
                  />

                  {/* Details */}
                  <div className="flex flex-col gap-1 items-center w-full">
                    <p className="text-base font-medium text-gray-700 text-center">
                      {fullName}
                    </p>

                    {/* Warehouse */}
                    <div className="flex gap-1.5 items-center justify-center text-gray-500 w-full">
                      <IconBuilding className="size-3.5 shrink-0" />
                      <p
                        title={
                          member.warehouses.length > 0
                            ? member.warehouses.map(w => w.name).join(", ")
                            : "Not assigned yet"
                        }
                        className="text-sm text-gray-500 truncate"
                      >
                        {member.warehouses.length > 0
                          ? member.warehouses.length === 1
                            ? member.warehouses[0].name
                            : `${member.warehouses[0].name}, +${member.warehouses.length - 1} more`
                          : "Not assigned yet"}
                      </p>
                    </div>

                    {/* Phone */}
                    <div className="flex gap-1.5 items-center justify-center text-gray-500 w-full">
                      <IconPhone className="size-3.5 shrink-0" />
                      <p className="text-sm text-gray-500">
                        {member.phone_number || "No phone"}
                      </p>
                    </div>

                    {/* Role Badge */}
                    <RoleBadge
                      role={member.role as "admin" | "staff"}
                      className="absolute top-4 right-4"
                    />

                    {/* Edit Button - Only show if not current user */}
                    {member.id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-4 right-4 size-8"
                        onClick={() => onEdit(member)}
                        title="Edit staff member"
                      >
                        <IconEdit className="size-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </ul>
          );
        })
      )}
    </li>
  );
}
