import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseConfig, testDatabaseConnection } from '@/lib/db-check';

/**
 * Health check endpoint
 * Use this to diagnose configuration and connection issues
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = checkDatabaseConfig();
    const dbTest = await testDatabaseConnection();
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      configuration: {
        mongodb: config.hasMongoUri ? 'configured' : 'missing',
        azureOpenAI: config.hasAzureOpenAI ? 'configured' : 'missing',
        rapidAPI: config.hasRapidAPI ? 'configured' : 'missing'
      },
      database: {
        connected: dbTest.success,
        error: dbTest.error,
        details: dbTest.details
      },
      configStatus: config.configStatus
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
