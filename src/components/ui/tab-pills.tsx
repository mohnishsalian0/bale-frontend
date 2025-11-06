import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TabPillsOption {
	value: string;
	label: string;
}

export interface TabPillsProps {
	options: TabPillsOption[];
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
}

const TabPills = React.forwardRef<HTMLDivElement, TabPillsProps>(
	({ options, value, onValueChange, className }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					'bg-primary-100 flex gap-1 h-11 items-center p-1 pb-1.5 rounded-md w-fit',
					className
				)}
			>
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => onValueChange(option.value)}
						className={cn(
							'px-2 py-1.5 pb-1 rounded text-sm transition-colors',
							value === option.value
								? 'bg-white text-gray-700 border border-gray-300 shadow-gray-sm'
								: 'text-gray-700'
						)}
					>
						{option.label}
					</button>
				))}
			</div>
		);
	}
);

TabPills.displayName = 'TabPills';

export { TabPills };
