import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { withAuth, AuthenticatedUser, generateUserSessionId } from '@/lib/auth-simple';
import { validateFileUpload, createValidationErrorResponse } from '@/lib/validation';
import { parseLinkedInCSV, addProfiles } from '@/lib/utils';

/**
 * CSV Upload API
 * 
 * Handles LinkedIn connections CSV file upload and processing:
 * 1. Validates file type and format
 * 2. Parses CSV using PapaParse library
 * 3. Converts raw data to structured Profile objects
 * 4. Stores profiles in persistent storage with user isolation
 * 
 * Expected CSV format:
 * - First Name, Last Name, Position, Company, Location, etc.
 * - Supports various LinkedIn export formats
 * 
 * @param request - FormData containing CSV file
 * @returns Success status and profile count
 */
async function handlePost(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate file upload
    const fileValidation = validateFileUpload(file);
    if (!fileValidation.isValid) {
      return createValidationErrorResponse(fileValidation.errors);
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV with PapaParse
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    // Check for parsing errors
    if (parseResult.errors.length > 0) {
      return NextResponse.json({ 
        error: 'CSV parsing failed', 
        details: parseResult.errors 
      }, { status: 400 });
    }

    // Check if we have any data
    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json({ 
        error: 'No data found in CSV file' 
      }, { status: 400 });
    }

    // Generate a user-specific session ID for this upload
    const sessionId = generateUserSessionId(user, 'upload');
    console.log('Generated sessionId:', sessionId);

    // Convert raw CSV data to Profile objects with session ID
    const profiles = parseLinkedInCSV(parseResult.data as Record<string, string>[], sessionId);

    // Validate profile count (prevent abuse)
    if (profiles.length > 1000) {
      return NextResponse.json({ 
        error: 'Too many profiles in CSV file. Maximum allowed is 1000 profiles.' 
      }, { status: 400 });
    }

    // Store profiles in database with user isolation
    try {
      await addProfiles(profiles, user.userId);
      console.log(`Successfully stored ${profiles.length} profiles in database`);
    } catch (dbError) {
      console.error('Database error during profile storage:', dbError);
      return NextResponse.json({
        error: 'Failed to save profiles to database',
        details: 'Please check your database connection and try again',
        fallback: true,
        message: `Profiles processed but not saved: ${profiles.length} profiles`,
        totalCount: profiles.length,
        sessionId: sessionId,
        userId: user.userId
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${profiles.length} profiles`,
      totalCount: profiles.length,
      sessionId: sessionId,
      userId: user.userId
    });

  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Export the authenticated handler
export const POST = withAuth(handlePost);