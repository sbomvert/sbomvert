'use client'
import { useRouter } from 'next/navigation'
import { Shield,ShieldX,Upload,Clock,SearchSlash,Scale,Home } from 'lucide-react';

const navItems = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Scale, label: "SBOM Comparison", href: "/home/compare" },
  { icon: ShieldX, label: "CVE Comparison", href: "main" },
  { icon: SearchSlash, label: "Scan Image", href: "actions" },
  { icon: Upload, label: "Upload SBOM", href: "actions" },
  { icon: Clock, label: "Recent Scans", href: "history" },
];


export default function Sidebar() {
      const router = useRouter()

  return (
    <aside className="w-64 bg-background border-r-8 border-border flex flex-col">
      <nav className="flex flex-col p-2">
        {navItems.map((item, idx) => {
          const Icon = item.icon || Shield
          return (
            <div key={idx} className="hover:bg-border transition p-2">
            <button
              onClick={() => router.push(item.href)}
              className="flex items-center gap-3 text-left px-3 py-2 rounded-md "
            >
              <Icon className="w-5 h-5" aria-hidden />
              <span>{item.label}</span>
            </button>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
