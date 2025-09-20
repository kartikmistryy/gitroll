import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { withAuth, AuthenticatedUser, generateUserSessionId } from '@/lib/auth-simple';
import { validateLinkedInUrl, createValidationErrorResponse, validateRequestBody } from '@/lib/validation';
import { convertRapidAPIProfile, addProfile } from '@/lib/utils';

async function handlePost(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    // Validate request body
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createValidationErrorResponse(bodyValidation.errors);
    }

    const { url } = bodyValidation.data;

    // Validate LinkedIn URL
    const urlValidation = validateLinkedInUrl(url);
    if (!urlValidation.isValid) {
      return createValidationErrorResponse(urlValidation.errors);
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
      return NextResponse.json({ 
        error: 'RapidAPI key not configured' 
      }, { status: 500 });
    }

    // Call RapidAPI with timeout
    const response = await axios.get(
      'https://li-data-scraper.p.rapidapi.com/get-profile-data-by-url',
      {
        params: { url },
        headers: {
          'X-Rapidapi-Key': process.env.RAPIDAPI_KEY,
          'X-Rapidapi-Host': 'li-data-scraper.p.rapidapi.com'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (!response.data || response.data.error) {
      return NextResponse.json({ 
        error: 'Failed to scrape profile data',
        details: response.data?.error || 'Unknown error'
      }, { status: 400 });
    }

    // Convert to Profile object with user session ID
    const profile = convertRapidAPIProfile(response.data, url);
    profile.uploadSessionId = generateUserSessionId(user, 'scrape');
    
    console.log(`Scraped profile for ${profile.name}:`);
    console.log(`- Profile picture: ${profile.profilePicture ? 'Found' : 'Not found'}`);
    console.log(`- Email: ${profile.email ? 'Found' : 'Not found'}`);
    console.log(`- Skills: ${profile.skills?.length || 0} skills found`);

    // Store in MongoDB with user isolation
    await addProfile(profile, user.userId);

    return NextResponse.json({
      success: true,
      message: 'Profile scraped successfully',
      profile: {
        id: profile.id,
        name: profile.name,
        title: profile.title,
        company: profile.company,
        location: profile.location,
        industry: profile.industry,
        linkedinUrl: profile.linkedinUrl,
        summary: profile.summary,
        uploadSessionId: profile.uploadSessionId
      },
      userId: user.userId
    });
  } catch (error: unknown) {
    if ((error as AxiosError).response?.status === 429) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    if ((error as AxiosError).response?.status === 404) {
      return NextResponse.json({ 
        error: 'Profile not found or not accessible' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      error: 'Failed to scrape profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Export the authenticated handler
export const POST = withAuth(handlePost);
