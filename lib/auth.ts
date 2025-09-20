import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

/**
 * Authentication utilities for API routes
 */

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId: string;
}

/**
 * Authenticate API request and return user information
 * This function works with Clerk's auth() in API routes
 * @param request - NextRequest object
 * @returns AuthenticatedUser or null if not authenticated
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      console.log('No userId found in auth');
      return null;
    }

    // Extract email from session claims
    const email = sessionClaims?.email as string;
    if (!email) {
      console.log('No email found in session claims');
      return null;
    }

    // Generate a session ID for this user's current session
    const sessionId = `user-${userId}-${Date.now()}`;

    return {
      userId,
      email,
      sessionId
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
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
 * Validate user ownership of a resource
 * @param user - Authenticated user
 * @param resourceUserId - User ID associated with the resource
 * @returns boolean indicating if user owns the resource
 */
export function validateResourceOwnership(user: AuthenticatedUser, resourceUserId: string): boolean {
  return user.userId === resourceUserId;
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
