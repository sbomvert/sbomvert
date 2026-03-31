import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar/Navbar';


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
          {children}
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
