/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
