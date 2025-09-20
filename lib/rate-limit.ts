import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiting for API endpoints
 * In production, use Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  // General API endpoints
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests. Please try again later.'
  },
  
  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many file uploads. Please try again later.'
  },
  
  // Profile scraping endpoints
  SCRAPING: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Too many profile scraping requests. Please try again later.'
  },
  
  // Profile matching endpoints
  MATCHING: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    message: 'Too many matching requests. Please try again later.'
  }
} as const;

/**
 * Check if request is within rate limit
 * @param identifier - Unique identifier for rate limiting (e.g., user ID, IP)
 * @param config - Rate limit configuration
 * @returns Object with isAllowed and remaining requests
 */
export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig
): { isAllowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${identifier}:${config.windowMs}`;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    
    return {
      isAllowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      isAllowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    isAllowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Create rate limit error response
 * @param message - Error message
 * @param resetTime - When the rate limit resets
 * @returns NextResponse with rate limit error
 */
export function createRateLimitResponse(message: string, resetTime: number): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  return NextResponse.json({
    error: 'Rate limit exceeded',
    message,
    retryAfter
  }, {
    status: 429,
    headers: {
      'Retry-After': retryAfter.toString(),
      'X-RateLimit-Reset': resetTime.toString()
    }
  });
}

/**
 * Rate limiting middleware wrapper
 * @param config - Rate limit configuration
 * @param getIdentifier - Function to get identifier from request
 * @returns Middleware function
 */
export function withRateLimit<T extends unknown[]>(
  config: RateLimitConfig,
  getIdentifier: (request: NextRequest, ...args: T) => string
) {
  return function rateLimitMiddleware(
    handler: (request: NextRequest, ...args: T) => Promise<Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      const identifier = getIdentifier(request, ...args);
      const rateLimitResult = checkRateLimit(identifier, config);
      
      if (!rateLimitResult.isAllowed) {
        return createRateLimitResponse(
          config.message || 'Rate limit exceeded',
          rateLimitResult.resetTime
        );
      }
      
      const response = await handler(request, ...args);
      
      // Add rate limit headers to response
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      return response;
    };
  };
}

/**
 * Clean up expired rate limit entries
 * Call this periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP address from request
 * @param request - NextRequest object
 * @returns Client IP address
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to connection remote address
  return 'unknown';
}

/**
 * Add security headers to response
 * @param response - NextResponse object
 * @returns Response with security headers
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CORS headers for API endpoints
  response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'development' ? '*' : 'https://yourdomain.com');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

// Clean up rate limit store every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
