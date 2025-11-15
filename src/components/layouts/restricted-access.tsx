'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface RestrictedAccessProps {
	message?: string;
}

export function RestrictedAccess({
	message = 'You do not have permission to access this page.',
}: RestrictedAccessProps) {
	const router = useRouter();

	const handleGoHome = () => {
		router.back();
	};

	return (
		<div className="min-h-dvh relative flex flex-col items-center justify-center gap-8">
			<Image
				src="/mascot/restricted-zone.png"
				alt="Restricted Access"
				width={300}
				height={300}
				priority
			/>
			<div className="flex flex-col items-center gap-4">
				<h1 className="text-2xl font-semibold text-gray-700">
					Access Restricted
				</h1>
				<p className="text-base text-gray-500 text-center max-w-md px-4">
					{message}
				</p>
			</div>
			<Button onClick={handleGoHome} size="lg" className="mt-4">
				Go Back
			</Button>
		</div>
	);
}
