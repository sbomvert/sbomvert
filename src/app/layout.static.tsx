import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import { StaticHeader } from '@/components/layout/StaticHeader';
import { Providers } from '@/components/providers';
import { connection } from 'next/server';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

// no title here: each page renders its own <title> (PageTitle does), and Next's would come first in <head>
// self-hosted at build time: no request to Google when the page loads
const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  description: FEATURE_FLAGS.STATIC_MODE
    ? 'Analyze and translate container image SBOMs in your browser'
    : 'Compare SBOM tool outputs for container images',
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/favicon.ico` },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // render per request, not at build time, so the scan flag comes from the running environment.
  // The static build has no server: rendered once, at build time.
  if (!FEATURE_FLAGS.STATIC_MODE) await connection();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          {/* one piece of chrome: the sidebar carries the logo, the links and the theme switch; the static build,
              with three pages, has a bar instead */}
          <div className={`min-h-screen flex bg-background ${FEATURE_FLAGS.STATIC_MODE ? 'flex-col' : ''}`}>
            {FEATURE_FLAGS.STATIC_MODE ? <StaticHeader /> : <Sidebar scanEnabled={FEATURE_FLAGS.ENABLE_SCAN_API} />}

            <div className="flex flex-1 min-w-0 min-h-0 flex-col">
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-360 px-4 py-8 sm:px-6 lg:px-8">
                  {children}
                </div>
              </main>

              <footer className="shrink-0 py-6 text-center text-caption text-foreground-subtle">
                © {new Date().getFullYear()} jackops.dev · Apache-2.0 license
                <div className="mt-1">
                  <a
                    href="https://github.com/sbomvert/sbomvert"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground-muted hover:text-foreground hover:underline transition-colors"
                  >
                    GitHub Repository
                  </a>
                </div>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
