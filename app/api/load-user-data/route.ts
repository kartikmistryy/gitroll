import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, UserProfile } from '@/lib/mongodb';
import { withAuth, AuthenticatedUser } from '@/lib/auth-simple';

/**
 * Load user data from MongoDB
 * Returns user's profiles and match history
 */
async function handleGet(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    // Use authenticated user's email for security
    const userEmail = user?.email;
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'User email not available',
        message: 'Authentication failed'
      }, { status: 401 });
    }

    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<UserProfile>('users');

    const userDoc = await usersCollection.findOne({ email: userEmail });

    if (!userDoc) {
      return NextResponse.json({ 
        success: true, 
        data: {
          matches: []
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        matches: userDoc.matches || [],
        user: {
          name: userDoc.name,
          imageUrl: userDoc.imageUrl,
          email: userDoc.email
        }
      },
      userId: userDoc._id
    });
  } catch (error) {
    console.error('Error in load-user-data API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to load user data',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// Export the authenticated handler with rate limiting
export const GET = withAuth(handleGet);
