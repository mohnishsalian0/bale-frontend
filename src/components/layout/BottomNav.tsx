'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: '/illustrations/dashboard.png' },
  { href: '/dashboard/inventory', label: 'Inventory', icon: '/illustrations/inventory.png' },
  { href: '/dashboard/stock-flow', label: 'Stock flow', icon: '/illustrations/stock-flow.png' },
  { href: '/dashboard/orders', label: 'Orders', icon: '/illustrations/sales-order.png' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background-100 shadow-[0px_-1px_3px_0px_rgba(16,24,40,0.1),0px_-1px_2px_0px_rgba(16,24,40,0.06)] z-50">
      <div className="flex items-center justify-between px-4 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 min-w-[40px]"
            >
              <div className={`relative w-6 h-6 ${!isActive ? 'grayscale' : ''}`}>
                <Image
                  src={item.icon}
                  alt={item.label}
                  fill
                  className="object-contain"
                />
              </div>
              <span
                className={`text-xs ${
                  isActive
                    ? 'text-primary-700 font-semibold'
                    : 'text-gray-500 font-medium'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
