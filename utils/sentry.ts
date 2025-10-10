import { config } from './config';
import { logger } from './logger';

// Conditionally import Sentry only if enabled
let Sentry: any = null;

if (config.sentryEnabled && config.sentryDsn) {
  try {
    Sentry = require('@sentry/react-native');
  } catch (error) {
    logger.warn('Sentry package not installed, error tracking disabled');
  }
}

/**
 * Initialize Sentry error tracking for production monitoring
 *
 * Features:
 * - Real-time error reporting
 * - Performance monitoring (APM)
 * - Release tracking
 * - Breadcrumb tracking for debugging
 * - User context and session tracking
 *
 * @see https://docs.sentry.io/platforms/react-native/
 */
export function initializeSentry(): void {
  // Only initialize if Sentry is enabled and DSN is provided
  if (!config.sentryDsn || !config.sentryEnabled || !Sentry) {
    logger.info('Sentry disabled or not configured');
    return;
  }

  try {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.appEnv,
      enabled: config.sentryEnabled,

      // Performance Monitoring
      tracesSampleRate: config.appEnv === 'production' ? 0.2 : 1.0, // 20% in prod, 100% in dev

      // Session Tracking
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000, // 30 seconds

      // Error Capture
      attachStacktrace: true,
      maxBreadcrumbs: 100,

      // Before sending event to Sentry
      beforeSend(event, hint) {
        // Don't send events in development (only log locally)
        if (config.appEnv === 'development') {
          logger.debug('Sentry event (not sent in dev)', { event, hint });
          return null;
        }

        // Filter out non-critical errors
        const error = hint.originalException;
        if (error instanceof Error) {
          // Don't report network timeouts as critical
          if (error.message.includes('timeout') || error.message.includes('Network request failed')) {
            event.level = 'warning';
          }
        }

        return event;
      },

      // Before sending breadcrumb
      beforeBreadcrumb(breadcrumb) {
        // Filter out sensitive data from breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.data) {
          // Remove potential API keys or tokens
          const sensitivePatterns = ['key', 'token', 'password', 'secret'];
          Object.keys(breadcrumb.data).forEach((key) => {
            if (sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern))) {
              breadcrumb.data![key] = '[Filtered]';
            }
          });
        }

        return breadcrumb;
      },

      // Integration Configuration
      integrations: [
        new Sentry.ReactNativeTracing({
          // Routing instrumentation for React Navigation
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),

          // Performance monitoring for fetch requests
          traceFetch: true,
          traceXHR: true,

          // Enable user interaction breadcrumbs
          enableUserInteractionTracing: true,
        }),
      ],
    });

    logger.info('Sentry initialized successfully', {
      environment: config.appEnv,
      tracesSampleRate: config.appEnv === 'production' ? 0.2 : 1.0,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Failed to initialize Sentry', err);
  }
}

/**
 * Set user context for error tracking
 * Call this after user authentication
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
}): void {
  if (!config.sentryEnabled || !Sentry) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  logger.debug('Sentry user context set', { userId: user.id });
}

/**
 * Clear user context (call on sign out)
 */
export function clearSentryUser(): void {
  if (!config.sentryEnabled || !Sentry) return;

  Sentry.setUser(null);
  logger.debug('Sentry user context cleared');
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(
  category: string,
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>
): void {
  if (!config.sentryEnabled || !Sentry) return;

  Sentry.addBreadcrumb({
    category,
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Manually capture an exception
 */
export function captureSentryException(
  error: Error,
  context?: Record<string, unknown>
): void {
  if (!config.sentryEnabled || !Sentry) return;

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });

  logger.error('Exception captured by Sentry', error, context);
}

/**
 * Capture a message (not an error)
 */
export function captureSentryMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: Record<string, unknown>
): void {
  if (!config.sentryEnabled || !Sentry) return;

  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context,
    },
  });
}

/**
 * Start a performance transaction
 */
export function startSentryTransaction(name: string, op: string): any | null {
  if (!config.sentryEnabled || !Sentry) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}

// Re-export Sentry for direct use (may be null if not installed)
export { Sentry };
