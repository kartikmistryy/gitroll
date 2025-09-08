import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, UserProfile } from '@/lib/mongodb';

/**
 * Load user data from MongoDB
 * Returns user's profiles and match history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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

    const user = await usersCollection.findOne({ email });

    if (!user) {
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
        matches: user.matches || [],
        user: {
          name: user.name,
          imageUrl: user.imageUrl,
          email: user.email
        }
      }
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
