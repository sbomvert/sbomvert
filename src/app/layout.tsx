import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'SBOMVert',
  description: 'Compare SBOM tool outputs for container images',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col transition-colors duration-300">
            <Navbar />
            <div className="flex flex-1 min-h-0 bg-background">
              <Sidebar />

              <div className="flex flex-1 min-h-0 flex-col">
                <main className="flex-1 overflow-y-auto">
                  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {children}
                  </div>
                </main>

                <footer className="shrink-0 py-6 text-center text-body-sm text-foreground-muted">
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
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
