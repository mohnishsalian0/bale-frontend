'use client';

import Image from 'next/image';
import { getPartnerName } from '@/lib/utils/partner';
import { getInitials } from '@/lib/utils/initials';
import type { RecentPartner } from '@/lib/queries/dashboard';
import ImageWrapper from './image-wrapper';

interface PartnerButtonProps {
	partner: RecentPartner;
	onClick: () => void;
}

export function PartnerButton({ partner, onClick }: PartnerButtonProps) {
	const name = getPartnerName(partner);
	return (
		<button
			onClick={onClick}
			className="w-30 flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
		>
			<div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
				<ImageWrapper
					size="md"
					shape="circle"
					alt={name}
					placeholderInitials={getInitials(name)}
				/>
			</div>
			<span className="text-xs text-gray-700 text-center line-clamp-2" title={name}>
				{name}
			</span>
		</button>
	);
}
