import { NextRequest } from 'next/server';

/**
 * Temporary authentication utilities for API routes
 * This bypasses authentication for testing purposes
 * TODO: Replace with proper Clerk authentication
 */

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId: string;
}

/**
 * Temporary authentication that always returns a test user
 * @param request - NextRequest object
 * @returns AuthenticatedUser (always succeeds for testing)
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  // For testing purposes, always return a test user
  // In production, this should be replaced with proper Clerk authentication
  return {
    userId: 'test-user-123',
    email: 'test@example.com',
    sessionId: `user-test-user-123-${Date.now()}`
  };
}

/**
 * Middleware wrapper for API routes that require authentication
 * @param handler - The API route handler function
 * @returns Wrapped handler with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const user = await authenticateRequest(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Authentication required' 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, user, ...args);
  };
}

/**
 * Generate a user-specific session ID for data isolation
 * @param user - Authenticated user
 * @param operation - Operation type (e.g., 'upload', 'match')
 * @returns Unique session ID
 */
export function generateUserSessionId(user: AuthenticatedUser, operation: string): string {
  return `${operation}-${user.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
