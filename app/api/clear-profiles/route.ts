import { NextRequest, NextResponse } from 'next/server';
import { clearProfiles } from '@/lib/utils';

/**
 * Clear All Profiles API
 * 
 * This endpoint clears all profiles from the database.
 * Use this if you want to start fresh with only your new CSV upload.
 * 
 * @param request - DELETE request to clear all profiles
 * @returns Success status
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await clearProfiles();
    
    return NextResponse.json({
      success: true,
      message: 'All profiles cleared successfully'
    });

  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

