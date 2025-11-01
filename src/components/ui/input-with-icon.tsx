import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
	icon?: React.ReactNode;
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
	({ className, icon, ...props }, ref) => {
		if (!icon) {
			return <Input ref={ref} className={className} {...props} />;
		}

		return (
			<div className="relative">
				<div className="absolute flex justify-center items-center left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500">
					{icon}
				</div>
				<Input
					ref={ref}
					className={cn('pl-12', className)}
					{...props}
				/>
			</div>
		);
	}
);

InputWithIcon.displayName = 'InputWithIcon';

export { InputWithIcon };
