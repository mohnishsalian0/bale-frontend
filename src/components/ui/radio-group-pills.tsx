'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface RadioGroupProps {
	value: string;
	onValueChange: (value: string) => void;
	name: string;
	className?: string;
	children: React.ReactNode;
	disabled?: boolean;
}

interface RadioGroupItemProps {
	value: string;
	children: React.ReactNode;
	className?: string;
}

const RadioGroupContext = React.createContext<{
	value: string;
	onValueChange: (value: string) => void;
	name: string;
	disabled?: boolean;
} | null>(null);

function RadioGroup({ value, onValueChange, name, className, children, disabled }: RadioGroupProps) {
	return (
		<RadioGroupContext.Provider value={{ value, onValueChange, name, disabled }}>
			<div className={cn('flex gap-2', className)} role="radiogroup">
				{children}
			</div>
		</RadioGroupContext.Provider>
	);
}

function RadioGroupItem({ value, children, className }: RadioGroupItemProps) {
	const context = React.useContext(RadioGroupContext);

	if (!context) {
		throw new Error('RadioGroupItem must be used within RadioGroup');
	}

	const isSelected = context.value === value;
	const isDisabled = context.disabled;
	const id = `${context.name}-${value}`;

	return (
		<label
			htmlFor={id}
			className={cn(
				'px-4 py-2 text-sm font-medium rounded-2xl border-2 transition-colors',
				isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
				isSelected
					? 'bg-primary-200 border-primary-700 text-gray-700'
					: 'bg-gray-100 border-border text-gray-700',
				className
			)}
		>
			<input
				type="radio"
				id={id}
				name={context.name}
				value={value}
				checked={isSelected}
				onChange={(e) => !isDisabled && context.onValueChange(e.target.value)}
				disabled={isDisabled}
				className="sr-only"
			/>
			{children}
		</label>
	);
}

export { RadioGroup, RadioGroupItem };
