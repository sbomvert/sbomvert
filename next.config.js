/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // shared workspace package, consumed as TypeScript source
  transpilePackages: ['@sbomvert/core'],
  allowedDevOrigins: ['127.0.0.1'],
  reactStrictMode: true,
  images: {
    domains: [],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
