interface TabUnderlineProps {
	activeTab: string;
	onTabChange: (tab: string) => void;
	tabs: Array<{
		value: string;
		label: string;
	}>;
}

export function TabUnderline({ activeTab, onTabChange, tabs }: TabUnderlineProps) {
	return (
		<div className="sticky top-0 z-10 flex border-b border-border bg-background">
			{tabs.map((tab) => (
				<button
					key={tab.value}
					onClick={() => onTabChange(tab.value)}
					className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.value
						? 'text-primary-700 border-b-2 border-primary-700'
						: 'text-gray-500 hover:text-gray-700'
						}`}
				>
					{tab.label}
				</button>
			))}
		</div>
	);
}
