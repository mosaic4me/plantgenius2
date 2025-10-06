/**
 * Security headers configuration for production deployment
 *
 * These headers protect against common web vulnerabilities:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME-type sniffing
 * - Insecure connections
 *
 * Apply these headers to all HTTP responses from your backend/API
 */

export const SECURITY_HEADERS = {
  // Prevent MIME-type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Enable browser XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Force HTTPS connections
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data: https: blob:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React Native requires unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "connect-src 'self' https://api.plant.id https://*.supabase.co https://api.paystack.co https://api.smtp2go.com https://*.sentry.io",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (formerly Feature-Policy)
  'Permissions-Policy': [
    'camera=self',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()',
  ].join(', '),
};

/**
 * Apply security headers to a response (for backend use)
 */
export function applySecurityHeaders(headers: Record<string, string>): Record<string, string> {
  return {
    ...SECURITY_HEADERS,
    ...headers,
  };
}

/**
 * Validate that security headers are present in a response
 */
export function validateSecurityHeaders(headers: Record<string, string>): {
  valid: boolean;
  missing: string[];
} {
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Strict-Transport-Security',
  ];

  const missing = requiredHeaders.filter(
    header => !headers[header] && !headers[header.toLowerCase()]
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}
