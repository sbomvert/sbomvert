'use client';
import { useSession } from '@better-auth-ui/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, ShieldX, Scale, Home, FileChartColumnIncreasing, Upload, ScanText, LogIn, ArrowLeftRight } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { UserButton } from '@/components/auth/user/user-button';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { ThemeSwitch } from '@/components/themeSwitch/ThemeSwitch';


// Its own component: useSession needs the AuthProvider, which is only there with auth enabled.
function SidebarAccount() {
  const { data: session } = useSession(authClient);

  // on the phone rail just the avatar: the full button (name, email) is wider than the rail
  return session ? (
    <>
      <UserButton size="icon" className="md:hidden" />
      <UserButton className="hidden md:inline-flex w-full" />
    </>
  ) : (
    <Link href="/auth/sign-in" title="Login" className={itemClass(false)}>
      <LogIn className={iconClass(false)} strokeWidth={1.75} aria-hidden />
      <span className={labelClass}>Login</span>
    </Link>
  );
}

// on a phone the sidebar is a rail of icons: the labels stay for screen readers
const labelClass = 'sr-only md:not-sr-only text-body-sm';
const iconClass = (current: boolean) => `size-4.5 shrink-0 ${current ? 'text-primary-fg' : 'text-foreground-subtle'}`;
const itemClass = (current: boolean) =>
  // 44px rows on touch screens, 36px from md up, where the pointer is a mouse.
  // The current page is one surface step up from the sidebar: white on light, a lighter ink on dark
  `w-full flex items-center justify-center md:justify-start gap-2.5 rounded-md px-3 min-h-11 md:min-h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    current ? 'bg-surface text-foreground font-medium shadow-card' : 'text-foreground-muted hover:bg-surface/60 hover:text-foreground'
  }`;

const isCurrent = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

type NavItem = { icon: typeof Home; label: string; href: string; server?: boolean };

export default function Sidebar({ scanEnabled = false }: { scanEnabled?: boolean }) {
  const pathname = usePathname() ?? '';

  // server: the page is not in the static build
  const allGroups: { label?: string; items: NavItem[] }[] = [
    { items: [{ icon: Home, label: 'Home', href: '/' }] },
    {
      label: 'Analyze',
      items: [
        { icon: FileChartColumnIncreasing, label: 'SBOM Analysis', href: '/compare/analyze' },
        { icon: ArrowLeftRight,            label: 'Translate SBOM', href: '/translate' },
      ],
    },
    {
      label: 'Compare',
      items: [
        { icon: Scale,   label: 'SBOM Comparison', href: '/compare/sbom', server: true },
        { icon: ShieldX, label: 'CVE Comparison',  href: '/compare/cve', server: true },
      ],
    },
    {
      label: 'Data',
      items: [
        ...(scanEnabled ? [{ icon: ScanText, label: 'Scan', href: '/scan' }] : []),
        ...(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD ? [{ icon: Upload, label: 'Upload SBOM', href: '/compare/upload/sbom' }] : []),
      ],
    },
  ];
  const groups = allGroups
    .map(g => ({ ...g, items: g.items.filter(item => !(FEATURE_FLAGS.STATIC_MODE && item.server)) }))
    .filter(g => g.items.length > 0);

  return (
    <aside className="w-16 md:w-60 shrink-0 sticky top-0 h-screen bg-background-alt border-r border-border flex flex-col">
      <Link
        href="/"
        className="flex items-center justify-center md:justify-start gap-2 h-14 px-3 md:px-5 shrink-0 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {/* next/image does not add the base path to a file of public/: a plain img does not need it either way */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/logo.svg`} width={24} height={24} alt="" className="size-6" />
        <span className="sr-only md:not-sr-only text-body font-semibold text-foreground">SBOMVert</span>
      </Link>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className={gi > 0 ? 'mt-5' : 'mt-1'}>
            {group.label && (
              <p className="hidden md:block px-3 mb-1 text-label uppercase tracking-wider text-foreground-subtle">{group.label}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map(item => {
                const Icon = item.icon || Shield;
                const current = isCurrent(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? 'page' : undefined}
                      title={item.label}
                      className={itemClass(current)}
                    >
                      <Icon className={iconClass(current)} strokeWidth={1.75} aria-hidden />
                      <span className={labelClass}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* account and theme on one row; stacked on the phone rail, which is one icon wide */}
      <div className="flex flex-col md:flex-row md:items-center gap-0.5 p-3 border-t border-border">
        {FEATURE_FLAGS.ENABLE_AUTH && (
          <div className="self-center md:self-auto min-w-0 md:flex-1">
            <SidebarAccount />
          </div>
        )}
        <ThemeSwitch className="self-center md:ml-auto shrink-0" />
      </div>
    </aside>
  );
}
