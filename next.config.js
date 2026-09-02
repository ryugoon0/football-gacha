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
  env: {
    // Stamped when the bundle is built, so a screenshot always says which
    // deploy it came from. The commit alone is not enough — the same commit
    // can be redeployed, and then two builds look identical.
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
