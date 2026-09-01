/**
 * Security headers. The game is a static client app that talks only to
 * Supabase, so the policy can stay tight: no framing, no MIME sniffing, no
 * referrer leakage, and no access to camera, microphone or location.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Clickjacking protection for browsers that prefer CSP over X-Frame-Options.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
