import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

/**
 * Clerk authentication utilities for API routes
 */

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId: string;
}

/**
 * Authenticate API request using Clerk
 * @param request - NextRequest object
 * @returns AuthenticatedUser or null if not authenticated
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const { userId, sessionClaims } = await auth();
    
    console.log('Auth result:', { userId, sessionClaims });
    
    if (!userId) {
      console.log('No userId found in auth');
      return null;
    }

    // Extract email from session claims - it might be in different fields
    let email = sessionClaims?.email as string;
    
    // If email is not in sessionClaims, try other common fields
    if (!email) {
      email = sessionClaims?.email_addresses?.[0]?.email_address as string;
    }
    
    // If still no email, use a fallback based on userId
    if (!email) {
      email = `user-${userId}@clerk.local`;
      console.log('No email found in session claims, using fallback:', email);
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
