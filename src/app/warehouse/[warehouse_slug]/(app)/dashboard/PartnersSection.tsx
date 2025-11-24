'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PartnerButton } from '@/components/ui/partner-button';
import { IconPlus, IconUsers } from '@tabler/icons-react';
import type { RecentPartner } from '@/lib/queries/dashboard';
import { AddPartnerSheet } from '../partners/AddPartnerSheet';
import router from 'next/router';
import { useSession } from '@/contexts/session-context';
import { PartnerType } from '@/types/database/enums';

interface PartnersSectionProps {
	title: string;
	newButtonLabel: string;
	partnerType: PartnerType;
	partners: RecentPartner[];
	totalCount: number;
	onPartnerAdded?: () => void;
}

export function PartnersSection({
	title,
	newButtonLabel,
	partnerType,
	partners,
	totalCount,
	onPartnerAdded,
}: PartnersSectionProps) {
	const { warehouse } = useSession();
	const [showAddPartnerSheet, setShowAddPartnerSheet] = useState(false);

	if (partners.length === 0) {
		return (
			<div className="flex flex-col">
				<div className="flex items-center justify-between px-4 py-2">
					<h2 className="text-lg font-bold text-gray-900">{title}</h2>
					<Button variant="ghost" size="sm" onClick={() => setShowAddPartnerSheet(true)}>
						<IconPlus />
						{newButtonLabel}
					</Button>
				</div>
				<div className="px-4 py-8 text-center">
					<p className="text-sm text-gray-500">No {title.toLowerCase()} yet</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-col">
				<div className="flex items-center justify-between px-4 py-2">
					<h2 className="text-lg font-bold text-gray-900">{title}</h2>
					<Button variant="ghost" size="sm" onClick={() => setShowAddPartnerSheet(true)}>
						<IconPlus />
						{newButtonLabel}
					</Button>
				</div>
				<div className="px-4">
					<div className="grid grid-cols-4 gap-3">
						{partners.map((partner) => (
							<PartnerButton
								key={partner.id}
								partner={partner}
								onClick={() => router.push(`/warehouse/${warehouse.slug}/partners/${partner.id}`)}
							/>
						))}
						{/* View all button if more than 7 partners */}
						{totalCount > 7 && (
							<button
								onClick={() => router.push(`/warehouse/${warehouse.slug}/partners?type=customer`)}
								className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 transition-colors"
							>
								<div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
									<IconUsers className="size-5 text-gray-600" />
								</div>
								<span className="text-xs text-gray-700 text-center">View all</span>
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Add Partner Sheet */}
			<AddPartnerSheet
				open={showAddPartnerSheet}
				onOpenChange={setShowAddPartnerSheet}
				onPartnerAdded={onPartnerAdded}
				partnerType={partnerType}
			/>
		</>
	);
}
