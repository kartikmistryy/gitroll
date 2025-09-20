import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

/**
 * Simple Clerk authentication utilities for API routes
 * Works with Clerk's built-in authentication without Bearer tokens
 */

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId: string;
}

/**
 * Authenticate API request using Clerk's built-in authentication
 * @param request - NextRequest object
 * @returns AuthenticatedUser or null if not authenticated
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No userId found in auth');
      return null;
    }

    // Get current user information
    const user = await currentUser();
    
    if (!user) {
      console.log('No current user found');
      return null;
    }

    // Extract email from user object
    let email = user.emailAddresses?.[0]?.emailAddress;
    
    if (!email) {
      email = `user-${userId}@clerk.local`;
      console.log('No email found in user object, using fallback:', email);
    }

    // Generate a session ID for this user's current session
    const sessionId = `user-${userId}-${Date.now()}`;

    console.log('Authentication successful:', { userId, email });

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
          message: 'Authentication required. Please sign in to continue.' 
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
