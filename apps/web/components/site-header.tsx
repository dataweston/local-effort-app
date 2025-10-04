'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { Button } from '@local-office/ui';

const links = [
  { href: '/employee', label: 'Employee' },
  { href: '/admin', label: 'Admin' },
  { href: '/provider', label: 'Provider' }
];

export function SiteHeader() {
  const pathname = usePathname();
  const active = useMemo(() => pathname ?? '/', [pathname]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold text-brand-700">
          Local Office
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={active.startsWith(link.href) ? 'text-brand-700' : 'hover:text-brand-600'}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/docs">API Docs</Link>
          </Button>
          <Button asChild>
            <Link href="/request-demo">Request demo</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
