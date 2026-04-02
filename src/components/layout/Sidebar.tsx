'use client';
import { useRouter } from 'next/navigation';
import { Shield, ShieldX, Scale, Home, FileChartColumnIncreasing, Upload } from 'lucide-react';

const navItems = [
  { icon: Home,                    label: 'Home',            href: '/' },
  { icon: FileChartColumnIncreasing, label: 'SBOM Analysis', href: '/compare/analyze' },
  { icon: Scale,                   label: 'SBOM Comparison', href: '/compare/sbom' },
  { icon: ShieldX,                 label: 'CVE Comparison',  href: '/compare/cve' }
];

if (process.env.NEXT_PUBLIC_ENABLE_SBOM_UPLOAD === 'true'){
navItems.push({ icon: Upload,                  label: 'Upload SBOM',     href: '/compare/upload/sbom' })
} 

export default function Sidebar() {
  const router = useRouter();

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
    </aside>
  );
}
