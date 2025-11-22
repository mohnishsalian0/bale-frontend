'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { PublicProduct } from '@/lib/queries/catalog';

export interface CartItem {
	product: PublicProduct;
	quantity: number;
}

interface CartContextType {
	items: CartItem[];
	addItem: (product: PublicProduct, quantity: number) => void;
	removeItem: (productId: string) => void;
	updateQuantity: (productId: string, quantity: number) => void;
	clearCart: () => void;
	totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'bale_cart';

export function CartProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<CartItem[]>([]);
	const [isHydrated, setIsHydrated] = useState(false);

	// Load cart from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(CART_STORAGE_KEY);
			if (stored) {
				setItems(JSON.parse(stored));
			}
		} catch (error) {
			console.error('Failed to load cart from localStorage:', error);
		}
		setIsHydrated(true);
	}, []);

	// Save cart to localStorage whenever it changes
	useEffect(() => {
		if (isHydrated) {
			try {
				localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
			} catch (error) {
				console.error('Failed to save cart to localStorage:', error);
			}
		}
	}, [items, isHydrated]);

	const addItem = (product: PublicProduct, quantity: number) => {
		setItems((prev) => {
			const existing = prev.find((item) => item.product.id === product.id);
			if (existing) {
				return prev.map((item) =>
					item.product.id === product.id
						? { ...item, quantity: item.quantity + quantity }
						: item
				);
			}
			return [...prev, { product, quantity }];
		});
	};

	const removeItem = (productId: string) => {
		setItems((prev) => prev.filter((item) => item.product.id !== productId));
	};

	const updateQuantity = (productId: string, quantity: number) => {
		if (quantity <= 0) {
			removeItem(productId);
			return;
		}
		setItems((prev) =>
			prev.map((item) =>
				item.product.id === productId ? { ...item, quantity } : item
			)
		);
	};

	const clearCart = () => {
		setItems([]);
	};

	const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<CartContext.Provider
			value={{
				items,
				addItem,
				removeItem,
				updateQuantity,
				clearCart,
				totalItems,
			}}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart() {
	const context = useContext(CartContext);
	if (context === undefined) {
		throw new Error('useCart must be used within a CartProvider');
	}
	return context;
}
