'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface NotesEditSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	initialNotes: string | null;
	onSuccess: () => void;
}

export function NotesEditSheet({
	open,
	onOpenChange,
	orderId,
	initialNotes,
	onSuccess,
}: NotesEditSheetProps) {
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const isMobile = useIsMobile();

	useEffect(() => {
		if (open) {
			setNotes(initialNotes || '');
		}
	}, [open, initialNotes]);

	const handleCancel = () => {
		onOpenChange(false);
	};

	const handleConfirm = async () => {
		try {
			setLoading(true);
			const supabase = createClient();

			const { error } = await supabase
				.from('sales_orders')
				.update({ notes: notes || null })
				.eq('id', orderId);

			if (error) throw error;

			toast.success('Notes updated');
			onSuccess();
			onOpenChange(false);
		} catch (error) {
			console.error('Error updating notes:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to update noteuctions');
		} finally {
			setLoading(false);
		}
	};

	const formContent = (
		<div className="flex flex-col gap-4 p-4 md:px-0">
			<Textarea
				placeholder="Enter notes..."
				value={notes}
				onChange={(e) => setNotes(e.target.value)}
				className="min-h-32"
			/>
		</div>
	);

	const footerButtons = (
		<div className="flex gap-3 w-full">
			<Button
				type="button"
				variant="outline"
				onClick={handleCancel}
				className="flex-1"
				disabled={loading}
			>
				Cancel
			</Button>
			<Button
				type="button"
				onClick={handleConfirm}
				className="flex-1"
				disabled={loading}
			>
				{loading ? 'Saving...' : 'Save'}
			</Button>
		</div>
	);

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Notes</DrawerTitle>
					</DrawerHeader>
					{formContent}
					<DrawerFooter>
						{footerButtons}
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Notes</DialogTitle>
				</DialogHeader>
				{formContent}
				<DialogFooter>
					{footerButtons}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
