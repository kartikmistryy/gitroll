import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth-simple';
import { validateSessionId, createValidationErrorResponse } from '@/lib/validation';
import { clearProfilesBySession } from '@/lib/utils';

/**
 * Clear User Profiles API
 * 
 * This endpoint clears profiles for a specific user session.
 * Only clears profiles that belong to the authenticated user.
 * 
 * @param request - DELETE request with sessionId to clear user's profiles
 * @returns Success status
 */
async function handleDelete(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const { sessionId } = await request.json();

    // Validate session ID
    const sessionValidation = validateSessionId(sessionId);
    if (!sessionValidation.isValid) {
      return createValidationErrorResponse(sessionValidation.errors);
    }

    // Verify the session belongs to the authenticated user
    if (!sessionId.startsWith(`upload-${user.userId}-`) && !sessionId.startsWith(`user-${user.userId}-`)) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You can only clear your own profiles'
      }, { status: 403 });
    }

    // Clear profiles from database with user isolation
    await clearProfilesBySession(sessionId, user.userId);
    
    return NextResponse.json({
      success: true,
      message: `Profiles cleared successfully for session: ${sessionId}`,
      sessionId: sessionId
    });

  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Export the authenticated handler
export const DELETE = withAuth(handleDelete);

