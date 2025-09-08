import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, UserProfile, UserMatch } from '@/lib/mongodb';

/**
 * Save user data to MongoDB
 * This includes profiles and matches for a specific user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, name, imageUrl, matches, recommendations, mission } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const usersCollection = db.collection<UserProfile>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      // Update existing user
      const updateData: Partial<UserProfile> = {
        name,
        imageUrl,
        updatedAt: new Date(),
      };

      // Add new match if provided
      if (matches && matches.length > 0 && mission && recommendations) {
        const newMatch: UserMatch = {
          id: `match_${Date.now()}`,
          mission,
          matches,
          recommendations,
          createdAt: new Date(),
        };
        
        // Check if a similar match already exists (same mission and same number of matches)
        const existingMatch = existingUser.matches.find(existing => 
          existing.mission === mission && 
          existing.matches.length === matches.length &&
          Math.abs(new Date(existing.createdAt).getTime() - newMatch.createdAt.getTime()) < 300000 // Within 5 minutes
        );
        
        if (!existingMatch) {
          updateData.matches = [...existingUser.matches, newMatch];
        }
      }

      await usersCollection.updateOne(
        { email },
        { $set: updateData }
      );

      return NextResponse.json({ 
        success: true, 
        message: 'User data updated successfully',
        userId: existingUser._id 
      });
    } else {
      // Create new user
      const newUser: UserProfile = {
        email,
        name,
        imageUrl,
        matches: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add initial match if provided
      if (matches && matches.length > 0 && mission && recommendations) {
        const initialMatch: UserMatch = {
          id: `match_${Date.now()}`,
          mission,
          matches,
          recommendations,
          createdAt: new Date(),
        };
        newUser.matches = [initialMatch];
      }

      const result = await usersCollection.insertOne(newUser);

      return NextResponse.json({ 
        success: true, 
        message: 'User data saved successfully',
        userId: result.insertedId 
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 }
    );
  }
}
