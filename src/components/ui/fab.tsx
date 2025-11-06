import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	/**
	 * Additional className for the button
	 */
	className?: string;
}

const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
	({ className, ...props }, ref) => {
		return (
			<Button
				ref={ref}
				size="icon"
				className={cn(
					'size-14 rounded-full shadow-none border-shadow-primary active:border-none',
					className
				)}
				{...props}
			>
				<IconPlus className="size-6 text-base-white" />
			</Button>
		);
	}
);

Fab.displayName = 'Fab';

export { Fab };
