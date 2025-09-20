import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/auth-simple';
import { getActiveSessions, getSessionProfiles, getSessionCount } from '@/lib/session-storage';

/**
 * Debug Sessions API
 * 
 * Shows all active sessions and their profile counts
 */
async function handleGet(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const activeSessions = getActiveSessions();
    const sessionCount = getSessionCount();
    
    const sessionDetails = activeSessions.map(sessionId => ({
      sessionId,
      profileCount: getSessionProfiles(sessionId).length,
      belongsToUser: sessionId.startsWith(`upload-${user.userId}-`) || sessionId.startsWith(`user-${user.userId}-`)
    }));

    return NextResponse.json({
      success: true,
      totalSessions: sessionCount,
      activeSessions: sessionDetails,
      userId: user.userId
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Debug sessions error:', error);
    
    return NextResponse.json({
      error: 'Debug failed',
      details: errorMessage
    }, { status: 500 });
  }
}

// Export the authenticated handler
export const GET = withAuth(handleGet);
