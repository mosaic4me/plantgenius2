import { logger } from './logger';

/**
 * Rate limiter to prevent API abuse and excessive requests
 *
 * Usage:
 * ```typescript
 * const isLimited = rateLimiter.isRateLimited('user-123', { windowMs: 60000, maxRequests: 10 });
 * if (isLimited) {
 *   throw new Error('Rate limit exceeded');
 * }
 * ```
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in window
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup old entries every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600000);
  }

  /**
   * Check if a key has exceeded the rate limit
   */
  isRateLimited(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get existing requests for this key
    const userRequests = this.requests.get(key) || [];

    // Filter to only requests within the current window
    const recentRequests = userRequests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= config.maxRequests) {
      logger.warn('Rate limit exceeded', {
        key,
        requests: recentRequests.length,
        limit: config.maxRequests,
        windowMs: config.windowMs,
      });
      return true;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return false;
  }

  /**
   * Get remaining requests for a key
   */
  getRemainingRequests(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);

    return Math.max(0, config.maxRequests - recentRequests.length);
  }

  /**
   * Get time until rate limit resets
   */
  getResetTime(key: string, config: RateLimitConfig): number {
    const userRequests = this.requests.get(key) || [];
    if (userRequests.length === 0) return 0;

    const oldestRequest = Math.min(...userRequests);
    const resetTime = oldestRequest + config.windowMs;

    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Clear rate limit for a key (use for testing or manual reset)
   */
  clear(key: string): void {
    this.requests.delete(key);
    logger.debug('Rate limit cleared', { key });
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.requests.forEach((timestamps, key) => {
      // Remove timestamps older than 1 hour
      const valid = timestamps.filter(time => time > now - 3600000);

      if (valid.length === 0) {
        this.requests.delete(key);
        cleaned++;
      } else if (valid.length < timestamps.length) {
        this.requests.set(key, valid);
      }
    });

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup completed', { entriesRemoved: cleaned });
    }
  }

  /**
   * Destroy rate limiter and clear interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Common rate limit configurations
export const RATE_LIMITS = {
  // Plant identification: 10 requests per minute
  PLANT_ID: {
    windowMs: 60000,
    maxRequests: 10,
  },

  // Authentication: 5 attempts per 5 minutes
  AUTH: {
    windowMs: 300000,
    maxRequests: 5,
  },

  // API general: 100 requests per minute
  API_GENERAL: {
    windowMs: 60000,
    maxRequests: 100,
  },

  // Password reset: 3 attempts per hour
  PASSWORD_RESET: {
    windowMs: 3600000,
    maxRequests: 3,
  },

  // Payment: 5 attempts per 10 minutes
  PAYMENT: {
    windowMs: 600000,
    maxRequests: 5,
  },
};
