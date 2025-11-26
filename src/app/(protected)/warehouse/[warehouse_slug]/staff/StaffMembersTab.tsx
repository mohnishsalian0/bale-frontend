'use client';

import { IconBuilding, IconPhone } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';
import ImageWrapper from '@/components/ui/image-wrapper';
import { getInitials } from '@/lib/utils/initials';
import { RoleBadge } from '@/components/ui/role-badge';
import { UserRole } from '@/types/database/enums';

interface StaffMember {
	id: string;
	name: string;
	phoneNumber: string | null;
	role: UserRole;
	warehouseNames: string[];
	profileImageUrl: string | null;
}

interface StaffMembersTabProps {
	staff: StaffMember[];
}

export function StaffMembersTab({ staff }: StaffMembersTabProps) {
	return (
		<li className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-4 items-stretch p-4">
			{staff.length === 0 ? (
				<div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
					<p className="text-gray-600 mb-2">No staff members found</p>
					<p className="text-sm text-gray-500">Add your first staff member</p>
				</div>
			) : (
				staff.map((member) => (
					<ul key={member.id}>
						<Card className="min-h-40">
							<CardContent className="relative p-4 flex flex-col gap-3 items-center h-full">
								{/* Avatar */}
								<ImageWrapper
									size="lg"
									shape="circle"
									imageUrl={member.profileImageUrl || undefined}
									alt={member.name}
									placeholderInitials={getInitials(member.name)}
								/>

								{/* Details */}
								<div className="flex flex-col gap-1 items-center w-full">
									<p className="text-base font-medium text-gray-900 text-center">
										{member.name}
									</p>

									{/* Warehouse */}
									<div className="flex gap-1.5 items-center justify-center text-gray-500 w-full">
										<IconBuilding className="size-3.5 shrink-0" />
										<p
											title={
												member.warehouseNames.length > 0
													? member.warehouseNames.join(', ')
													: 'Not assigned yet'
											}
											className="text-xs text-gray-500 truncate"
										>
											{member.warehouseNames.length > 0
												? member.warehouseNames.length === 1
													? member.warehouseNames[0]
													: `${member.warehouseNames[0]}, +${member.warehouseNames.length - 1} more`
												: 'Not assigned yet'}
										</p>
									</div>

									{/* Phone */}
									<div className="flex gap-1.5 items-center justify-center text-gray-500 w-full">
										<IconPhone className="size-3.5 shrink-0" />
										<p className="text-xs text-gray-500">{member.phoneNumber || 'No phone'}</p>
									</div>

									{/* Role Badge */}
									<RoleBadge role={member.role} className='absolute top-4 right-4' />
								</div>
							</CardContent>
						</Card>
					</ul>
				))
			)}
		</li>
	);
}
