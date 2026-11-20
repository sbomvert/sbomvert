'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeSwitch } from '@/components/themeSwitch/ThemeSwitch';

// The static build has three pages: a sidebar would be mostly empty, so its chrome is one bar
const links = [
  { label: 'SBOM Analysis', href: '/compare/analyze' },
  { label: 'Translate SBOM', href: '/translate' },
];

export function StaticHeader() {
  const pathname = usePathname() ?? '';

  return (
    <header className="sticky top-0 z-30 h-14 shrink-0 flex items-center gap-2 sm:gap-6 px-4 sm:px-6 bg-background-alt border-b border-border">
      <Link
        href="/"
        className="flex items-center gap-2 shrink-0 rounded-md hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo.svg`} width={24} height={24} alt="" className="size-6" />
        <span className="hidden sm:inline text-body font-semibold text-foreground">SBOMVert</span>
      </Link>

      <nav aria-label="Main" className="flex items-center gap-1 min-w-0">
        {links.map(link => {
          const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? 'page' : undefined}
              className={`inline-flex items-center h-9 px-3 rounded-md text-body-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                current ? 'bg-surface text-foreground font-medium shadow-card' : 'text-foreground-muted hover:bg-surface/60 hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <ThemeSwitch className="ml-auto shrink-0" />
    </header>
  );
}
