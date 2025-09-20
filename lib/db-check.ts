/**
 * Database connection checker utility
 * Use this to diagnose MongoDB connection issues
 */

export function checkDatabaseConfig(): {
  hasMongoUri: boolean;
  hasAzureOpenAI: boolean;
  hasRapidAPI: boolean;
  configStatus: string;
} {
  const hasMongoUri = !!process.env.MONGODB_URI;
  const hasAzureOpenAI = !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
  const hasRapidAPI = !!process.env.RAPIDAPI_KEY;
  
  let configStatus = 'Configuration Status:\n';
  configStatus += `- MongoDB URI: ${hasMongoUri ? '✅ Configured' : '❌ Missing'}\n`;
  configStatus += `- Azure OpenAI: ${hasAzureOpenAI ? '✅ Configured' : '❌ Missing'}\n`;
  configStatus += `- RapidAPI: ${hasRapidAPI ? '✅ Configured' : '❌ Missing'}\n`;
  
  if (!hasMongoUri) {
    configStatus += '\n🔧 To fix MongoDB connection:\n';
    configStatus += '1. Create a MongoDB Atlas account at https://cloud.mongodb.com\n';
    configStatus += '2. Create a new cluster\n';
    configStatus += '3. Get your connection string\n';
    configStatus += '4. Add MONGODB_URI to your .env.local file\n';
    configStatus += '5. Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority\n';
  }
  
  return {
    hasMongoUri,
    hasAzureOpenAI,
    hasRapidAPI,
    configStatus
  };
}

/**
 * Test MongoDB connection
 */
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  error?: string;
  details: string;
}> {
  try {
    const { getDatabase } = await import('./mongodb');
    const db = await getDatabase();
    
    // Test a simple operation
    const collections = await db.listCollections().toArray();
    
    return {
      success: true,
      details: `Connected successfully. Found ${collections.length} collections.`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage,
      details: `Connection failed: ${errorMessage}`
    };
  }
}
