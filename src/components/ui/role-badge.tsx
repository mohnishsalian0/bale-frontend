import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/database/enums';

interface StatusBadgeProps {
	role: UserRole;
	className?: string;
}

interface StatusConfig {
	color: 'blue' | 'green' | 'orange' | 'red' | 'gray';
	variant: 'default' | 'secondary' | 'outline';
	label: string;
}

function getRoleConfig(role: UserRole): StatusConfig {
	switch (role) {
		case 'admin':
			return { color: 'blue', variant: 'secondary', label: 'Admin' };
		case 'staff':
			return { color: 'green', variant: 'secondary', label: 'Staff' };
		default:
			return { color: 'blue', variant: 'secondary', label: role };
	}
}

export function RoleBadge({ role, className }: StatusBadgeProps) {
	const config = getRoleConfig(role);

	return (
		<Badge color={config.color} variant={config.variant} className={cn('rounded-2xl text-nowrap', className)}>
			{config.label}
		</Badge>
	);
}
