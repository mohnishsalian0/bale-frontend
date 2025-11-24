import { IconPencil } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { type ComponentType, ReactNode } from "react";

interface SectionProps {
	title: string;
	subtitle: string;
	onEdit?: () => void;
	icon: ComponentType<{ className?: string }>;
	children?: ReactNode
}

export function Section({
	title,
	subtitle,
	onEdit,
	icon: Icon,
	children,
}: SectionProps) {
	return (
		<section className="mx-4 mt-3 p-5 space-y-4 rounded-lg border border-border">
			{/* Header Row */}
			<div className="flex items-center justify-between gap-3">
				<div className="size-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
					<span className="text-lg font-semibold text-gray-700">
						<Icon />
					</span>
				</div>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="font-semibold text-gray-700 truncate" title={title}>
							{title}
						</h3>
						{onEdit &&
							<Button variant="ghost" size="icon" onClick={onEdit}>
								<IconPencil />
							</Button>
						}
					</div>
					<p className={`text-sm text-gray-500 ${onEdit && '-mt-1'}`}>{subtitle}</p>
				</div>
			</div>

			{children}
		</section>
	);
}
