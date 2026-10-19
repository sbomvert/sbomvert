'use client';
import { useSession } from '@better-auth-ui/react';
import { useRouter } from 'next/navigation';
import { Shield, ShieldX, Scale, Home, FileChartColumnIncreasing, Upload, ScanText, LogIn } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { UserButton } from '@/components/auth/user/user-button';
import { FEATURE_FLAGS } from '@/lib/featureFlags';


export default function Sidebar() {
  const router = useRouter();
  const { data: session } = useSession(authClient);

  const navItems = [
    { icon: Home,                    label: 'Home',            href: '/' },
    { icon: FileChartColumnIncreasing, label: 'SBOM Analysis', href: '/compare/analyze' },
    { icon: Scale,                   label: 'SBOM Comparison', href: '/compare/sbom' },
    { icon: ShieldX,                 label: 'CVE Comparison',  href: '/compare/cve' },
    ...(FEATURE_FLAGS.ENABLE_SCAN_API
      ? [{ icon: ScanText, label: 'Scan', href: '/scan' }]
      : []),

    ...(FEATURE_FLAGS.ENABLE_SBOM_UPLOAD
      ? [{ icon: Upload, label: 'Upload SBOM', href: '/compare/upload/sbom' }]
      : []),
  ];

  return (
    <aside className="w-64 bg-background border-r-4 border-border flex flex-col">
      <nav className="flex flex-col p-2">
        {navItems.map((item, idx) => {
          const Icon = item.icon || Shield;
          return (
            <div key={idx} className="hover:bg-border transition p-2 rounded-md">
              <button
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 text-left px-3 py-2 w-full text-foreground"
              >
                <Icon className="w-5 h-5 text-foreground-muted" aria-hidden />
                <span className="text-body-sm font-medium">{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto p-2">
        {session ? (
            <UserButton />
        ) : (
          <div className="hover:bg-border transition rounded-md p-2">
            <button
              onClick={() => router.push('/auth/sign-in')}
              className="flex items-center gap-3 text-left px-3 py-2 w-full text-foreground"
            >
              <LogIn className="w-5 h-5 text-foreground-muted" aria-hidden />
              <span className="text-body-sm font-medium">Login</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
