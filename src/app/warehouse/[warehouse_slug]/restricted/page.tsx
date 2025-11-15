'use client';

import { useSearchParams } from 'next/navigation';
import { RestrictedAccess } from '@/components/layouts/restricted-access';

export default function RestrictedPage() {
	const searchParams = useSearchParams();
	const pageName = searchParams.get('page');

	const message = pageName
		? `You do not have permission to access ${pageName}. Contact your administrator.`
		: 'You do not have permission to access this page. Contact your administrator.';

	return <RestrictedAccess message={message} />;
}
