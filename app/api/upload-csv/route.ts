import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { parseLinkedInCSV, addProfiles } from '@/lib/utils';

/**
 * CSV Upload API
 * 
 * Handles LinkedIn connections CSV file upload and processing:
 * 1. Validates file type and format
 * 2. Parses CSV using PapaParse library
 * 3. Converts raw data to structured Profile objects
 * 4. Stores profiles in persistent file-based storage
 * 
 * Expected CSV format:
 * - First Name, Last Name, Position, Company, Location, etc.
 * - Supports various LinkedIn export formats
 * 
 * @param request - FormData containing CSV file
 * @returns Success status and profile count
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'text/csv') {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
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

    // Convert raw CSV data to Profile objects
    const profiles = parseLinkedInCSV(parseResult.data as Record<string, string>[]);

    // Store profiles in persistent storage
    await addProfiles(profiles);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${profiles.length} profiles`,
      totalCount: profiles.length
    });

  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}