import Image from 'next/image';

export default function LoadingState() {
	return (
		<div className="h-dvh relative flex flex-col items-center justify-center gap-4">
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
			<p className="text-gray-700">Page not found</p>
		</div>
	);
}
