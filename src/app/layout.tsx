import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar/Navbar';
import Sidebar from '@/components/layout/Sidebar';


export const metadata: Metadata = {
  title: 'SBOMVert',
  description: 'Compare SBOM tool outputs for container images',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="min-h-screen transition-colors duration-300">
          <Navbar />
          <div className="flex h-screen bg-background">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
              <main className="p-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
            </main>
          </div>
        </div>
        <footer className="py-6 text-center text-body-sm text-foreground-muted">
          © {new Date().getFullYear()} Author jackops.dev - License Apache-2
          <div className="mt-2">
            <a
              href="https://github.com/sbomvert/sbomvert"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
