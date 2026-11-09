// The Content-Security-Policy is built per request (with a nonce) in middleware.ts.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Admin panel must never be indexed.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Lint runs as part of `next build` so lint errors fail the build.
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Strip console.log/info/debug from production bundles; keep error/warn for diagnostics.
  compiler: {
    removeConsole: { exclude: ['error', 'warn'] },
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
