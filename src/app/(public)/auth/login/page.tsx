'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, Suspense } from 'react';
import Image from 'next/image';
import { IconBrandGoogleFilled } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { LoadingState } from '@/components/layouts/loading-state';

function LoginForm() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const searchParams = useSearchParams();
	const redirectTo = searchParams.get('redirectTo') || '/warehouse';

	const handleLogin = async () => {
		setLoading(true);
		setError('');

		try {
			const supabase = createClient();

			// Initiate Google OAuth - redirect to callback with redirectTo parameter
			const callbackUrl = `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

			const { error: authError } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: callbackUrl,
				},
			});

			if (authError) {
				throw authError;
			}

			// OAuth redirect will happen automatically
		} catch (err: any) {
			console.error('Error logging in:', err);
			setError(err.message || 'Failed to sign in with Google');
			setLoading(false);
		}
	};

	return (
		<div className="min-h-dvh flex items-center justify-center px-4">
			<div className="w-full max-w-[380px] flex flex-col gap-8 items-center">
				{/* Mascot Image */}
				<div className="relative size-70 shrink-0">
					<Image
						src="/mascot/welcome.png"
						alt="Welcome mascot"
						fill
						sizes="500px"
						className="object-contain"
						priority
					/>
				</div>

				{/* Welcome Message */}
				<div className="text-center flex flex-col gap-1 w-full">
					<h1 className="text-3xl font-semibold text-gray-700">
						Welcome fabric trader!
					</h1>
					<p className="text-base italic text-gray-500">
						I'm here to help you experience a smarter, newer & next generation inventory solution.
					</p>
				</div>

				{/* Error Message */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
						<p className="text-sm text-red-600">{error}</p>
					</div>
				)}

				{/* Login Button */}
				<Button
					onClick={handleLogin}
					disabled={loading}
					className="w-full"
				>
					{loading ? (
						<>
							<div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
							<span>Signing in...</span>
						</>
					) : (
						<>
							<IconBrandGoogleFilled className="w-6 h-6 text-white" />
							<span>Sign in with Google</span>
						</>
					)}
				</Button>
			</div>
		</div>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={(
			<LoadingState />
		)} >
			<LoginForm />
		</Suspense >
	)
}
