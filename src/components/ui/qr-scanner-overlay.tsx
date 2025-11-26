'use client';

import { IconBolt } from '@tabler/icons-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from '@/components/ui/button';

interface QRScannerOverlayProps {
	/**
	 * Whether the scanner is paused
	 */
	paused: boolean;
	/**
	 * Whether the torch/flashlight is on
	 */
	torch: boolean;
	/**
	 * Callback when torch button is toggled
	 */
	onTorchToggle: () => void;
	/**
	 * Callback when QR code is scanned
	 */
	onScan: (detectedCodes: any[]) => void;
	/**
	 * Callback when scanner encounters an error
	 */
	onError: (error: any) => void;
	/**
	 * Whether to show the resume scanning button
	 */
	showResumeButton?: boolean;
	/**
	 * Callback when resume button is clicked
	 */
	onResume?: () => void;
	/**
	 * Error message to display (if any)
	 */
	error?: string | null;
	/**
	 * Title text to display when no error
	 */
	title?: string;
}

export function QRScannerOverlay({
	paused,
	torch,
	onTorchToggle,
	onScan,
	onError,
	showResumeButton = false,
	onResume,
	error = null,
	title = 'Scan QR to add item',
}: QRScannerOverlayProps) {
	return (
		<div className="relative w-full aspect-square shrink-0 bg-gray-900 overflow-hidden">
			{/* Paused Overlay - Dim and blur the frozen frame */}
			{paused && (
				<div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm z-[5]" />
			)}

			{/* QR Scanner */}
			<Scanner
				onScan={onScan}
				onError={onError}
				formats={['qr_code']}
				paused={paused}
				components={{
					torch: torch,
					finder: false,
				}}
				constraints={{
					facingMode: 'environment',
				}}
				styles={{
					container: {
						width: '100%',
						height: '100%',
					},
					video: {
						objectFit: 'cover',
					},
				}}
			>
				{/* Custom Finder */}
				<div className="absolute top-1/2 left-1/2 w-2/3 h-2/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
					<div
						className="w-full h-full border-2 border-white rounded-2xl"
						style={{
							boxShadow: '0 0 0 9999px color-mix(in srgb, var(--color-gray-900) 80%, transparent)',
						}}
					/>
				</div>
			</Scanner>

			{/* Title & Error Overlay */}
			{error ? (
				<div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/50 text-red-900 px-4 py-2 text-sm text-nowrap rounded-lg z-10">
					{error}
				</div>
			) : (
				<p className="absolute top-8 left-1/2 -translate-x-1/2 text-lg text-white text-center whitespace-pre z-10">
					{title}
				</p>
			)}

			{/* Action Buttons */}
			<div className="flex gap-3 absolute bottom-8 left-1/2 -translate-x-1/2 text-center z-10">
				{/* Flashlight Button */}
				<Button
					type="button"
					variant={`${torch ? 'default' : 'outline'}`}
					size="icon"
					onClick={onTorchToggle}
					className={`${!torch ? 'border-gray-500 shadow-dark-gray-md hover:bg-gray-200 hover:text-gray-700' : ''}`}
				>
					<IconBolt className="rotate-[270deg]" />
				</Button>

				{/* Resume Scanning Button (conditionally rendered) */}
				{showResumeButton && onResume && (
					<Button
						type="button"
						onClick={onResume}
					>
						Resume scanning
					</Button>
				)}
			</div>
		</div>
	);
}
