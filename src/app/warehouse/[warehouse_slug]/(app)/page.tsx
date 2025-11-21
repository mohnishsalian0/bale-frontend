'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/layouts/loading-state';
import { useSession } from '@/contexts/session-context';

export default function RootPage() {
	const router = useRouter();
	const { warehouse } = useSession();

	useEffect(() => {
		// Redirect to dashboard
		router.replace(`/warehouse/${warehouse.slug}/dashboard`);
	}, [router, warehouse.slug]);

	return <LoadingState />;
}
