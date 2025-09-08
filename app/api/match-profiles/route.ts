import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  getAllProfiles, 
  saveProfiles,
  findTopMatches, 
  generateProfileText, 
  generateMissionText,
  MissionAttributes 
} from '@/lib/utils';

/**
 * Profile Matching API
 * 
 * This endpoint performs intelligent profile matching using:
 * 1. Azure OpenAI Embeddings for vector representations
 * 2. Cosine similarity for semantic matching
 * 3. Azure OpenAI GPT for generating recommendations
 * 
 * Process:
 * 1. Generate embedding for mission statement
 * 2. Generate embeddings for all profiles (if not cached)
 * 3. Calculate cosine similarity between mission and profiles
 * 4. Find top 5 most similar profiles
 * 5. Generate AI-powered recommendations
 * 
 * @param request - Contains mission statement and parsed attributes
 * @returns Top matches and intelligent recommendations
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Set a timeout for the entire operation (5 minutes for large datasets)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 300000);
  });

  const processPromise = (async (): Promise<NextResponse> => {
    try {
      const { mission, attributes } = await request.json();
      

    // Validate required inputs
    if (!mission || !attributes) {
      return NextResponse.json({ 
        error: 'Mission and attributes are required' 
      }, { status: 400 });
    }

    // Check if profiles are available
    const profiles = await getAllProfiles();
    if (profiles.length === 0) {
      return NextResponse.json({
        error: 'No profiles available for matching'
      }, { status: 400 });
    }
    

    // Validate Azure OpenAI configuration
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_DEPLOYMENT) {
      return NextResponse.json({ 
        error: 'Azure OpenAI configuration missing' 
      }, { status: 500 });
    }

    // Initialize Azure OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/v1`,
    });

    const embeddingsDeployment = 'text-embedding-3-large';
    const gptDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

    // Step 1: Generate mission embedding
    const missionText = generateMissionText(mission, attributes as MissionAttributes);
    const missionEmbeddingResponse = await openai.embeddings.create({
      model: embeddingsDeployment,
      input: missionText
    });
    const missionEmbedding = missionEmbeddingResponse.data[0].embedding;

    // Step 2: Generate embeddings for profiles that don't have them
    const profilesToProcess = profiles.filter(p => !p.embedding || p.embedding.length === 0);
    
    if (profilesToProcess.length > 0) {
      
      // Process embeddings in batches of 10 for better performance
      const batchSize = 10;
      for (let i = 0; i < profilesToProcess.length; i += batchSize) {
        const batch = profilesToProcess.slice(i, i + batchSize);
        
        try {
          // Process batch in parallel
          const batchPromises = batch.map(async (profile, batchIndex) => {
            const profileText = generateProfileText(profile);
            
            const profileEmbeddingResponse = await openai.embeddings.create({
              model: embeddingsDeployment,
              input: profileText
            });

            profile.embedding = profileEmbeddingResponse.data[0].embedding;
            return batchIndex;
          });
          
          await Promise.all(batchPromises);
          
          
        } catch {
          // Continue with next batch instead of failing completely
          continue;
        }
      }
      
      // Save profiles with their new embeddings back to storage
      await saveProfiles(profiles);
    }

    // Step 3: Find top matches using cosine similarity
    const topMatches = findTopMatches(missionEmbedding, profiles, 5);

    if (topMatches.length === 0) {
      return NextResponse.json({
        error: 'No suitable matches found'
      }, { status: 404 });
    }

    // Step 4: Generate AI recommendations
    const recommendationsPrompt = `
Mission: ${mission}

Mission Attributes:
- Industry: ${attributes.industry}
- Location: ${attributes.location}
- Role: ${attributes.role}
- Description: ${attributes.description}

Top Matches:
${topMatches.map((profile, index) => `
${index + 1}. ${profile.name}
   - Title: ${profile.title || 'Not specified'}
   - Company: ${profile.company || 'Not specified'}
   - Location: ${profile.location || 'Not specified'}
   - Industry: ${profile.industry || 'Not specified'}
   - Summary: ${profile.summary || 'Not specified'}
`).join('\n')}

Please provide a natural language response that:
1. Acknowledges the mission
2. Explains why these people are good matches
3. Provides specific recommendations for each person
4. Suggests next steps

Keep the tone professional and helpful.
`;

    const recommendationsResponse = await openai.chat.completions.create({
      model: gptDeployment,
      messages: [
        {
          role: 'system',
          content: 'You are a professional network analyst who provides insightful recommendations for business networking and partnerships.'
        },
        {
          role: 'user',
          content: recommendationsPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const recommendations = recommendationsResponse.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      message: 'Matches found successfully',
      matches: topMatches.map(match => ({
        id: match.id,
        name: match.name,
        title: match.title,
        company: match.company,
        location: match.location,
        industry: match.industry,
        linkedinUrl: match.linkedinUrl,
        summary: match.summary
      })),
      recommendations,
      totalProfiles: profiles.length
    });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json({
        error: 'Failed to find matches',
        details: errorMessage
      }, { status: 500 });
    }
  })();

  // Race between the process and timeout
  try {
    return await Promise.race([
      processPromise,
      timeoutPromise.then(() => {
        throw new Error('Request timeout');
      })
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json({
        error: 'Request timeout - too many profiles to process',
        details: 'Please try with fewer profiles or contact support'
      }, { status: 408 });
    }
    throw error; // Re-throw other errors
  }
}