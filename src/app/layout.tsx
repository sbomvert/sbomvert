import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SBOMVert',
  description: 'Compare SBOM tool outputs for container images',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <div className="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
          <Navbar />
          {children}
        </div>
        {/* Footer */}
        <footer className="py-6 text-center opacity-70 text-sm">
          © {new Date().getFullYear()} Author jackops.dev  - License Apache-2
          <div className="mt-2">
            <a
              href="https://github.com/sbomvert/sbomvert"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 transition-colors"
            >
              GitHub Repository
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
