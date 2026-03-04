/** @type {import('next').NextConfig} */
const baseCspDirectives =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https:; font-src 'self' data:; base-uri 'self'; form-action 'self'";

const embedFrameAncestors =
  "https://andreasbusk.dk https://www.andreasbusk.dk http://localhost:3000";

function buildCsp(frameAncestors) {
  return `${baseCspDirectives}; frame-ancestors ${frameAncestors}`;
}

const nextConfig = {
  output: 'standalone',
  experimental: {
    webpackMemoryOptimizations: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: buildCsp("'none'"),
          },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: buildCsp(embedFrameAncestors),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
