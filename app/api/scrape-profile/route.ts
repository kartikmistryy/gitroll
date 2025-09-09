import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import { convertRapidAPIProfile, addProfile } from '@/lib/utils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate LinkedIn URL
    if (!url.includes('linkedin.com/in/')) {
      return NextResponse.json({ 
        error: 'Please provide a valid LinkedIn profile URL' 
      }, { status: 400 });
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

    // Convert to Profile object
    const profile = convertRapidAPIProfile(response.data, url);

    // Store in MongoDB
    await addProfile(profile);

    return NextResponse.json({
      success: true,
      message: 'Profile scraped successfully',
      profile
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
