import Image from 'next/image';

interface LoadingStateProps {
	message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
	return (
		<div className="min-h-dvh relative flex flex-col items-center justify-center gap-12">
			<Image
				src="/mascot/loading-trolley-truck.png"
				alt="Loading"
				width={250}
				height={250}
				priority
				style={{
					maskImage: 'linear-gradient(to right, transparent 0%, black 30%)',
					WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 30%)',
				}}
			/>
			<i className="text-lg font-light text-gray-400">{message}</i>
		</div>
	);
}
