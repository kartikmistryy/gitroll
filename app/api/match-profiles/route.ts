import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAuth, AuthenticatedUser } from '@/lib/auth-simple';
import { 
  validateMissionStatement, 
  validateSessionId, 
  createValidationErrorResponse,
  validateRequestBody 
} from '@/lib/validation';
import { 
  getProfilesBySession, 
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
 * 2. Generate embeddings for all profiles (if not cached) with progress saving
 * 3. Calculate cosine similarity between mission and profiles
 * 4. Find top 5 most similar profiles
 * 5. Generate AI-powered recommendations
 * 
 * @param request - Contains mission statement, parsed attributes, and sessionId
 * @returns Top matches and intelligent recommendations
 */
async function handlePost(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  // Set a timeout for the entire operation (4 minutes for Vercel compatibility)
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 240000);
  });

  const processPromise = (async (): Promise<NextResponse> => {
    try {
      // Validate request body
      const bodyValidation = await validateRequestBody(request);
      if (!bodyValidation.isValid) {
        return createValidationErrorResponse(bodyValidation.errors);
      }

      const { mission, attributes, sessionId } = bodyValidation.data;

      console.log('Received sessionId:', sessionId, 'Type:', typeof sessionId);

      // Validate required inputs
      if (!mission || !attributes || !sessionId) {
        return NextResponse.json({ 
          error: 'Mission, attributes, and sessionId are required' 
        }, { status: 400 });
      }

      // Validate mission statement
      const missionValidation = validateMissionStatement(mission);
      if (!missionValidation.isValid) {
        return createValidationErrorResponse(missionValidation.errors);
      }

      // Validate session ID
      if (!sessionId) {
        return NextResponse.json({
          error: 'Session ID is required',
          message: 'Please upload a CSV file first to get a session ID'
        }, { status: 400 });
      }

      const sessionValidation = validateSessionId(sessionId);
      if (!sessionValidation.isValid) {
        console.log('Session validation failed:', sessionValidation.errors);
        return createValidationErrorResponse(sessionValidation.errors);
      }

      // Verify the session belongs to the authenticated user
      if (!sessionId.startsWith(`upload-${user.userId}-`) && !sessionId.startsWith(`user-${user.userId}-`)) {
        return NextResponse.json({
          error: 'Unauthorized',
          message: 'You can only match profiles from your own uploads'
        }, { status: 403 });
      }

    // Get profiles from the specific upload session with user isolation
    const profiles = await getProfilesBySession(sessionId, user.userId);
    console.log(`Processing ${profiles.length} profiles from session: ${sessionId}`);
    
    if (profiles.length === 0) {
      return NextResponse.json({
        error: 'No profiles found for this upload session'
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
    
    console.log(`Total profiles loaded: ${profiles.length}`);
    console.log(`Profiles with embeddings: ${profiles.filter(p => p.embedding && p.embedding.length > 0).length}`);
    console.log(`Profiles needing embeddings: ${profilesToProcess.length}`);
    
    // For very large datasets, limit processing to prevent timeouts
    const maxProfilesToProcess = 200; // Limit to prevent timeout
    const limitedProfilesToProcess = profilesToProcess.slice(0, maxProfilesToProcess);
    
    if (profilesToProcess.length > maxProfilesToProcess) {
      console.log(`Large dataset detected (${profilesToProcess.length} profiles). Processing first ${maxProfilesToProcess} profiles to prevent timeout.`);
    }
    
    if (limitedProfilesToProcess.length > 0) {
      console.log(`Processing embeddings for ${limitedProfilesToProcess.length} profiles...`);
      
      // Process embeddings in batches for better performance and reliability
      const batchSize = 5; // Smaller batch size for faster processing and better timeout handling
      let processedCount = 0;
      let failedBatches = 0;
      const maxFailedBatches = 3; // Allow some failures but not too many
      
      for (let i = 0; i < limitedProfilesToProcess.length; i += batchSize) {
        const batch = limitedProfilesToProcess.slice(i, i + batchSize);
        
        try {
          // Generate all profile texts first
          const profileTexts = batch.map(profile => generateProfileText(profile));
          
          // Single API call for the entire batch with timeout
          const batchEmbeddingResponse = await Promise.race([
            openai.embeddings.create({
              model: embeddingsDeployment,
              input: profileTexts
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Embedding API timeout')), 30000)
            )
          ]);

          // Assign embeddings back to profiles
          batch.forEach((profile, index) => {
            profile.embedding = batchEmbeddingResponse.data[index].embedding;
          });
          
          processedCount += batch.length;
          console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(limitedProfilesToProcess.length / batchSize)} (${processedCount}/${limitedProfilesToProcess.length} profiles)`);
          
          // Save progress after each batch to prevent data loss on timeout
          await saveProfiles(profiles, user.userId);
          console.log(`Progress saved: ${processedCount}/${limitedProfilesToProcess.length} profiles processed`);
          
        } catch (error) {
          console.error(`Failed to process batch starting at index ${i}:`, error);
          failedBatches++;
          
          // If too many batches fail, stop processing
          if (failedBatches >= maxFailedBatches) {
            console.error(`Too many failed batches (${failedBatches}), stopping processing`);
            break;
          }
          
          // Continue with next batch instead of failing completely
          continue;
        }
      }
      
      console.log(`Embeddings processing completed for ${processedCount} profiles`);
    }

    // Step 3: Find top matches using cosine similarity with minimum threshold
    const finalMatches = findTopMatches(missionEmbedding, profiles, 5, 0.3); // 0.3 minimum similarity threshold

    if (finalMatches.length === 0) {
      return NextResponse.json({
        error: 'No suitable matches found with sufficient similarity',
        details: 'Try refining your mission statement or upload more diverse profiles'
      }, { status: 404 });
    }

    // Step 4: Generate individual reasoning for each match
    const matchReasons = await Promise.all(
      finalMatches.map(async (match, index) => {
        const reasonPrompt = `
Mission: ${mission}

Mission Attributes:
- Industry: ${attributes.industry}
- Location: ${attributes.location}
- Role: ${attributes.role}
- Description: ${attributes.description}

Profile to analyze:
- Name: ${match.name}
- Title: ${match.title || 'Not specified'}
- Company: ${match.company || 'Not specified'}
- Location: ${match.location || 'Not specified'}
- Industry: ${match.industry || 'Not specified'}
- Summary: ${match.summary || 'Not specified'}
- Similarity Score: ${(match.similarity * 100).toFixed(1)}%

Please provide a concise explanation (2-3 sentences) of why this person is a good match for the mission. Focus on specific connections between their background and the mission requirements. Be precise and actionable.
`;

        try {
          const reasonResponse = await openai.chat.completions.create({
            model: gptDeployment,
            messages: [
              {
                role: 'system',
                content: 'You are a professional network analyst who provides precise, actionable explanations for why specific professionals are good matches for networking goals.'
              },
              {
                role: 'user',
                content: reasonPrompt
              }
            ],
            temperature: 0.5,
            max_tokens: 150
          });

          return {
            ...match,
            reasoning: reasonResponse.choices[0]?.message?.content || 'Good match based on profile analysis.'
          };
        } catch (error) {
          return {
            ...match,
            reasoning: 'Good match based on profile analysis.'
          };
        }
      })
    );

    // Step 5: Generate overall recommendations
    const recommendationsPrompt = `
Mission: ${mission}

Mission Attributes:
- Industry: ${attributes.industry}
- Location: ${attributes.location}
- Role: ${attributes.role}
- Description: ${attributes.description}

Top Matches:
${matchReasons.map((profile, index) => `
${index + 1}. ${profile.name}
   - Title: ${profile.title || 'Not specified'}
   - Company: ${profile.company || 'Not specified'}
   - Location: ${profile.location || 'Not specified'}
   - Industry: ${profile.industry || 'Not specified'}
   - Summary: ${profile.summary || 'Not specified'}
   - Similarity: ${(profile.similarity * 100).toFixed(1)}%
`).join('\n')}

Please provide a brief summary (2-3 sentences) that:
1. Acknowledges the mission
2. Highlights the overall quality of matches found
3. Suggests next steps for networking

Keep it concise and professional.
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
      matches: matchReasons.map(match => ({
        id: match.id,
        name: match.name,
        title: match.title,
        company: match.company,
        location: match.location,
        industry: match.industry,
        linkedinUrl: match.linkedinUrl,
        summary: match.summary,
        similarity: match.similarity,
        reasoning: match.reasoning
      })),
      recommendations,
      totalProfiles: profiles.length,
      processedProfiles: limitedProfilesToProcess.length,
      skippedProfiles: profilesToProcess.length > maxProfilesToProcess ? profilesToProcess.length - maxProfilesToProcess : 0,
      processingInfo: profilesToProcess.length > maxProfilesToProcess ? 
        `Processed first ${maxProfilesToProcess} profiles to prevent timeout. ${profilesToProcess.length - maxProfilesToProcess} profiles skipped.` : 
        'All profiles processed successfully.'
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

// Export the authenticated handler
export const POST = withAuth(handlePost);