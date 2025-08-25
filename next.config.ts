import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'api-server',
        port: '3000',
        pathname: '/uploads/**',
      },
      // Add support for production domains if needed
      {
        protocol: 'https',
        hostname: '**', // Allow any HTTPS domain for production flexibility
        pathname: '/uploads/**',
      }
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
