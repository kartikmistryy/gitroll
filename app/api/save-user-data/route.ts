import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, UserProfile, UserMatch } from '@/lib/mongodb';
import { withAuth, AuthenticatedUser } from '@/lib/auth-simple';
import { validateRequestBody, createValidationErrorResponse, validateEmail } from '@/lib/validation';

/**
 * Save user data to MongoDB
 * This includes profiles and matches for a specific user
 */
async function handlePost(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    // Validate request body
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createValidationErrorResponse(bodyValidation.errors);
    }

    const { name, imageUrl, matches, recommendations, mission } = bodyValidation.data;

    // Use authenticated user's email instead of request email for security
    const userEmail = user.email;
    
    // Validate email format
    const emailValidation = validateEmail(userEmail);
    if (!emailValidation.isValid) {
      return createValidationErrorResponse(emailValidation.errors);
    }

    const db = await getDatabase();
    const usersCollection = db.collection<UserProfile>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: userEmail });

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
        { email: userEmail },
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
        email: userEmail,
        name: name || user.email.split('@')[0],
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
        userId: result.insertedId,
        userEmail: userEmail
      });
    }
  } catch (err) {
    console.error('Error saving user data:', err);
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 }
    );
  }
}

// Export the authenticated handler
export const POST = withAuth(handlePost);
