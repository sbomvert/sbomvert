// static build: no server, only the routes named *.static.tsx
const isStatic = process.env.NEXT_PUBLIC_STATIC_MODE === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isStatic ? 'export' : 'standalone',
  pageExtensions: isStatic ? ['static.tsx'] : ['static.tsx', 'tsx', 'ts'],
  poweredByHeader: false,
  // shared workspace package, consumed as TypeScript source
  transpilePackages: ['@sbomvert/core', '@sbomvert/scan', '@sbomvert/storage'],
  allowedDevOrigins: ['127.0.0.1'],
  reactStrictMode: true,
  images: {
    domains: [],
    // the image optimizer runs on the server
    unoptimized: isStatic,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
