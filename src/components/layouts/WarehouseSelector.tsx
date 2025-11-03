'use client';

import Image from 'next/image';
import { IconMapPin, IconBuildingWarehouse } from '@tabler/icons-react';

interface Warehouse {
	id: string;
	name: string;
	address?: string;
	color?: string;
}

interface WarehouseSelectorProps {
	warehouses: Warehouse[];
	currentWarehouse: string;
	onSelect: (warehouseId: string) => void;
	onClose: () => void;
}

export default function WarehouseSelector({
	warehouses,
	currentWarehouse,
	onSelect,
	onClose,
}: WarehouseSelectorProps) {
	const handleSelect = (warehouseId: string) => {
		onSelect(warehouseId);
		onClose();
	};

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/20 z-10 animate-in fade-in-0 duration-300"
				onClick={onClose}
			/>

			{/* Dropdown Panel */}
			<div
				className="z-20 absolute w-full top-[64px] bg-background-100 border-b border-gray-200 overflow-hidden animate-in slide-in-from-top duration-300"
			>
				<div className="max-w-md mx-auto px-4 py-6">
					{/* Header with illustration */}
					<div className="flex items-end justify-between mb-6">
						<h2 className="text-3xl font-semibold text-gray-900">
							Warehouses
						</h2>
						<div className="relative w-24 h-24">
							<Image
								src="/illustrations/warehouse.png"
								alt="Warehouse"
								fill
								className="object-contain"
							/>
						</div>
					</div>

					{/* Warehouse List */}
					<div className="border-1 border-gray-200 rounded-lg overflow-hidden">
						{warehouses.map((warehouse, index) => {
							const isSelected = warehouse.id === currentWarehouse;

							return (
								<button
									key={warehouse.id}
									onClick={() => handleSelect(warehouse.id)}
									className={`w-full flex items-center gap-3 p-4 transition-colors cursor-pointer ${index !== warehouses.length - 1 ? 'border-b border-gray-200' : ''
										} ${isSelected
											? 'bg-primary-100'
											: 'bg-white hover:bg-gray-50'
										}`}
								>
									{/* Icon with background */}
									<div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-100' : 'bg-gray-100'
										}`}>
										<IconBuildingWarehouse className={`w-5 h-5 ${isSelected ? 'text-primary-700' : 'text-gray-500'
											}`} />
									</div>

									{/* Warehouse details */}
									<div className="flex-1 text-left">
										<div className="text-base font-medium text-gray-900">
											{warehouse.name}
										</div>
										{warehouse.address && (
											<div className="text-sm text-gray-500">
												{warehouse.address}
											</div>
										)}
									</div>

									{/* Selected indicator */}
									{isSelected && (
										<IconMapPin className="w-5 h-5 text-primary-700 flex-shrink-0" />
									)}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</>
	);
}
