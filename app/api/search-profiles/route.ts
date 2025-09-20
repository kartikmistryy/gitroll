import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAuth, AuthenticatedUser } from '@/lib/auth-simple';
import { validateRequestBody, createValidationErrorResponse, validateMissionStatement } from '@/lib/validation';
import { getProfilesBySession, generateProfileText, generateMissionText, findTopMatches, MissionAttributes } from '@/lib/utils';
import { getDatabase } from '@/lib/mongodb';

/**
 * Fast Profile Search API
 * 
 * 1. Gets profiles from current session (fast, no database)
 * 2. Uses AI to find best matches
 * 3. Only enriches matched profiles with RapidAPI
 */
async function handlePost(request: NextRequest, user: AuthenticatedUser): Promise<NextResponse> {
  try {
    // Validate request body
    const bodyValidation = await validateRequestBody(request);
    if (!bodyValidation.isValid) {
      return createValidationErrorResponse(bodyValidation.errors);
    }

    const { mission, sessionId, attributes } = bodyValidation.data;

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

    // Verify the session belongs to the authenticated user
    if (!sessionId.startsWith(`upload-${user.userId}-`) && !sessionId.startsWith(`user-${user.userId}-`)) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: 'You can only search profiles from your own uploads'
      }, { status: 403 });
    }

    // Get profiles from database with user isolation
    const profiles = await getProfilesBySession(sessionId, user.userId);
    
    console.log(`Session ID: ${sessionId}`);
    console.log(`Found ${profiles.length} profiles in database`);
    
    if (profiles.length === 0) {
      return NextResponse.json({
        error: 'No profiles found for this session',
        message: 'Please upload a CSV file first'
      }, { status: 400 });
    }

    console.log(`Searching through ${profiles.length} profiles for session ${sessionId}`);

    // Validate Azure OpenAI configuration
    if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
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

    // Step 2: Fast pre-filtering using text matching (no embeddings needed)
    console.log(`Pre-filtering ${profiles.length} profiles using text matching...`);
    
    // Create searchable text for each profile
    const profilesWithText = profiles.map(profile => ({
      ...profile,
      searchText: `${profile.name} ${profile.title || ''} ${profile.company || ''} ${profile.location || ''} ${profile.industry || ''} ${profile.summary || ''}`.toLowerCase()
    }));
    
    // Extract keywords from mission for text matching (more inclusive)
    const missionKeywords = mission.toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 2) // Reduced from 3 to 2
      .filter((word: string) => !['looking', 'find', 'want', 'need', 'seeking', 'searching', 'for', 'the', 'and', 'or', 'in', 'at', 'to', 'with'].includes(word));
    
    // Add common tech/industry keywords if not present
    const commonKeywords = ['engineer', 'developer', 'manager', 'director', 'lead', 'senior', 'tech', 'technology', 'software', 'data', 'ai', 'machine', 'learning', 'startup', 'company', 'business'];
    const allKeywords = [...missionKeywords, ...commonKeywords.filter(kw => !missionKeywords.includes(kw))];
    
    // Score profiles based on text matching (more generous scoring)
    const scoredProfiles = profilesWithText.map(profile => {
      let score = 0;
      
      // Basic keyword matching
      allKeywords.forEach((keyword: string) => {
        if (profile.searchText.includes(keyword)) {
          score += 1;
        }
      });
      
      // Bonus for exact matches in important fields
      if (profile.title && mission.toLowerCase().includes(profile.title.toLowerCase())) score += 3;
      if (profile.company && mission.toLowerCase().includes(profile.company.toLowerCase())) score += 3;
      if (profile.industry && mission.toLowerCase().includes(profile.industry.toLowerCase())) score += 3;
      
      // Partial matches in important fields
      if (profile.title) {
        allKeywords.forEach(keyword => {
          if (profile.title!.toLowerCase().includes(keyword)) score += 1;
        });
      }
      if (profile.company) {
        allKeywords.forEach(keyword => {
          if (profile.company!.toLowerCase().includes(keyword)) score += 1;
        });
      }
      if (profile.industry) {
        allKeywords.forEach(keyword => {
          if (profile.industry!.toLowerCase().includes(keyword)) score += 1;
        });
      }
      
      // Give minimum score to all profiles to ensure we have candidates
      if (score === 0) score = 0.1;
      
      return { ...profile, textScore: score };
    });
    
    // Sort by text score and take top candidates (be more inclusive)
    const topCandidates = scoredProfiles
      .sort((a, b) => b.textScore - a.textScore)
      .slice(0, 25); // Process top 25 candidates (increased from 15)
    
    console.log(`Pre-filtered to ${topCandidates.length} top candidates for embedding generation`);
    console.log(`Top candidates scores:`, topCandidates.slice(0, 10).map(p => ({ name: p.name, score: p.textScore })));
    
    // Step 3: Generate embeddings only for top candidates
    const candidatesToProcess = topCandidates.filter(p => !p.embedding || p.embedding.length === 0);
    
    if (candidatesToProcess.length > 0) {
      console.log(`Generating embeddings for ${candidatesToProcess.length} top candidates...`);
      
      // Process in parallel batches for maximum speed (5 batches of 10 profiles each)
      const batchSize = 10;
      const maxConcurrentBatches = 5;
      const batches = [];
      for (let i = 0; i < candidatesToProcess.length; i += batchSize) {
        batches.push(candidatesToProcess.slice(i, i + batchSize));
      }
      
      console.log(`Processing ${batches.length} batches of up to ${batchSize} profiles each with ${maxConcurrentBatches} concurrent batches...`);
      
      // Process batches in parallel groups
      const batchGroups = [];
      for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
        batchGroups.push(batches.slice(i, i + maxConcurrentBatches));
      }
      
      for (let groupIndex = 0; groupIndex < batchGroups.length; groupIndex++) {
        const batchGroup = batchGroups[groupIndex];
        console.log(`Processing batch group ${groupIndex + 1}/${batchGroups.length} (${batchGroup.length} batches)...`);
        
        // Process all batches in this group in parallel
        const groupPromises = batchGroup.map(async (batch, batchIndex) => {
          console.log(`Starting batch ${groupIndex * maxConcurrentBatches + batchIndex + 1} (${batch.length} profiles)...`);
          
          // Process all profiles in this batch in parallel
          const batchPromises = batch.map(async (profile) => {
            try {
              const profileText = generateProfileText(profile);
              
              const embeddingResponse = await openai.embeddings.create({
                model: embeddingsDeployment,
                input: profileText
              });

              profile.embedding = embeddingResponse.data[0].embedding;
              console.log(`✓ Generated embedding for ${profile.name}`);
              return { success: true, profile };
            } catch (error) {
              console.error(`✗ Failed to generate embedding for ${profile.name}:`, error);
              return { success: false, profile, error };
            }
          });
          
          // Wait for this batch to complete
          const batchResults = await Promise.all(batchPromises);
          const successful = batchResults.filter(r => r.success).length;
          console.log(`✓ Batch ${groupIndex * maxConcurrentBatches + batchIndex + 1} completed: ${successful}/${batch.length} successful`);
          
          return { batchIndex, successful, total: batch.length };
        });
        
        // Wait for all batches in this group to complete
        const groupResults = await Promise.all(groupPromises);
        const totalSuccessful = groupResults.reduce((sum, result) => sum + result.successful, 0);
        const totalProfiles = groupResults.reduce((sum, result) => sum + result.total, 0);
        console.log(`✓ Batch group ${groupIndex + 1} completed: ${totalSuccessful}/${totalProfiles} profiles successful`);
        
        // Small delay between batch groups to avoid overwhelming the API
        if (groupIndex < batchGroups.length - 1) {
          console.log('Waiting 1 second before next batch group...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Save only the processed candidates with embeddings back to database
      const candidatesWithNewEmbeddings = candidatesToProcess.filter(p => p.embedding && p.embedding.length > 0);
      if (candidatesWithNewEmbeddings.length > 0) {
        // Update only the specific profiles with embeddings in the database
        const db = await getDatabase();
        const profilesCollection = db.collection('profiles');
        
        const updatePromises = candidatesWithNewEmbeddings.map(async (profile) => {
          const uniqueKey = `${user.userId}-${profile.name.toLowerCase().trim()}-${(profile.company || 'unknown').toLowerCase().trim()}`;
          return profilesCollection.updateOne(
            { uniqueKey: uniqueKey },
            { $set: { embedding: profile.embedding, lastUpdated: new Date() } }
          );
        });
        
        await Promise.all(updatePromises);
        console.log(`Updated ${candidatesWithNewEmbeddings.length} profiles with new embeddings in database`);
      }
      console.log(`Completed embedding generation for ${candidatesToProcess.length} top candidates`);
    }

    // Step 4: Find top matches from candidates with embeddings
    const candidatesWithEmbeddings = topCandidates.filter(p => p.embedding && p.embedding.length > 0);
    console.log(`Finding matches from ${candidatesWithEmbeddings.length} candidates with embeddings`);
    const matches = findTopMatches(missionEmbedding, candidatesWithEmbeddings, 6, 0.1); // Reduced threshold from 0.3 to 0.1, increased results to 6
    console.log(`Found ${matches.length} matches`);

    if (matches.length === 0) {
      // Fallback: if no embeddings, return top text-scored profiles
      if (candidatesWithEmbeddings.length === 0) {
        console.log('No embeddings available, returning top text-scored profiles');
        const fallbackMatches = topCandidates.slice(0, 6).map(profile => ({
          ...profile,
          similarity: profile.textScore / 10, // Convert text score to similarity-like score
          reasoning: `This profile matches based on text analysis (score: ${profile.textScore})`
        }));
        
        return NextResponse.json({
          success: true,
          message: 'Matches found using text analysis (embeddings not available)',
          matches: fallbackMatches.map(match => ({
            id: match.id,
            name: match.name,
            title: match.title,
            company: match.company,
            location: match.location,
            industry: match.industry,
            linkedinUrl: match.linkedinUrl,
            summary: match.summary,
            profilePicture: '',
            email: '',
            skills: [],
            experience: '',
            education: '',
            similarity: match.similarity,
            reasoning: match.reasoning
          })),
          recommendations: 'These matches are based on text analysis. For more precise matching, try uploading profiles with more detailed information.',
          totalProfiles: profiles.length,
          processedProfiles: topCandidates.length,
          searchTime: Date.now()
        });
      }
      
      return NextResponse.json({
        error: 'No suitable matches found',
        details: 'Try refining your search or upload more diverse profiles',
        debug: {
          totalProfiles: profiles.length,
          candidatesWithEmbeddings: candidatesWithEmbeddings.length,
          missionText: missionText.substring(0, 100) + '...'
        }
      }, { status: 404 });
    }

    // Step 5: Generate AI reasoning for each match and enrich with RapidAPI
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        // Generate AI reasoning for why this profile matches
        let reasoning = '';
        try {
          const reasoningPrompt = `
Mission: ${mission}

Profile Details:
- Name: ${match.name}
- Title: ${match.title || 'Not specified'}
- Company: ${match.company || 'Not specified'}
- Location: ${match.location || 'Not specified'}
- Industry: ${match.industry || 'Not specified'}
- Summary: ${match.summary || 'Not specified'}
- Similarity Score: ${(match.similarity * 100).toFixed(1)}%

Explain in 2-3 sentences why this profile is a good match for the mission. Focus on specific skills, experience, or background that aligns with the mission.
`;

          const reasoningResponse = await openai.chat.completions.create({
            model: gptDeployment,
            messages: [
              {
                role: 'system',
                content: 'You are a professional network analyst who provides concise, specific reasoning for why profiles match networking goals.'
              },
              {
                role: 'user',
                content: reasoningPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 150
          });

          reasoning = reasoningResponse.choices[0]?.message?.content || 'This profile matches your networking goals based on their professional background and experience.';
        } catch (error) {
          console.log(`Failed to generate reasoning for ${match.name}:`, error);
          reasoning = 'This profile matches your networking goals based on their professional background and experience.';
        }

        // Enrich with RapidAPI if available
        let enrichedMatch = { ...match, reasoning };
        
        if (match.linkedinUrl && process.env.RAPIDAPI_KEY) {
          try {
            const axios = (await import('axios')).default;
            const response = await axios.get(
              'https://li-data-scraper.p.rapidapi.com/get-profile-data-by-url',
              {
                params: { url: match.linkedinUrl },
                headers: {
                  'X-Rapidapi-Key': process.env.RAPIDAPI_KEY,
                  'X-Rapidapi-Host': 'li-data-scraper.p.rapidapi.com'
                },
                timeout: 10000 // 10 second timeout
              }
            );

            if (response.data && !response.data.error) {
              // Process skills to ensure they're strings
              let processedSkills: string[] = [];
              if (response.data.skills && Array.isArray(response.data.skills)) {
                processedSkills = response.data.skills.map((skill: unknown) => {
                  if (typeof skill === 'string') {
                    return skill;
                  } else if (skill && typeof skill === 'object') {
                    const skillObj = skill as Record<string, unknown>;
                    return skillObj.name || skillObj.skill || skillObj.title || 'Unknown Skill';
                  }
                  return 'Unknown Skill';
                });
              }

              // Merge enriched data with match
              enrichedMatch = {
                ...enrichedMatch,
                profilePicture: response.data.profilePicture || response.data.avatar || '',
                summary: response.data.summary || response.data.about || match.summary,
                skills: processedSkills,
                location: response.data.location || match.location,
                industry: response.data.industry || match.industry,
                experience: response.data.experience || '',
                education: response.data.education || '',
                email: response.data.email || ''
              };
            }
          } catch (error) {
            console.log(`Failed to enrich ${match.name}:`, error);
          }
        }
        
        return enrichedMatch;
      })
    );

    // Step 6: Generate AI recommendations
    const recommendationsPrompt = `
Mission: ${mission}

Top Matches:
${enrichedMatches.map((profile, index) => `
${index + 1}. ${profile.name}
   - Title: ${profile.title || 'Not specified'}
   - Company: ${profile.company || 'Not specified'}
   - Location: ${profile.location || 'Not specified'}
   - Industry: ${profile.industry || 'Not specified'}
   - Summary: ${profile.summary || 'Not specified'}
   - Similarity: ${(profile.similarity * 100).toFixed(1)}%
`).join('\n')}

Provide a brief summary (2-3 sentences) highlighting the best matches and next steps.
`;

    const recommendationsResponse = await openai.chat.completions.create({
      model: gptDeployment,
      messages: [
        {
          role: 'system',
          content: 'You are a professional network analyst who provides concise recommendations for business networking.'
        },
        {
          role: 'user',
          content: recommendationsPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const recommendations = recommendationsResponse.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      message: 'Search completed successfully',
      matches: enrichedMatches.map(match => ({
        id: match.id,
        name: match.name,
        title: match.title,
        company: match.company,
        location: match.location,
        industry: match.industry,
        linkedinUrl: match.linkedinUrl,
        summary: match.summary,
        profilePicture: match.profilePicture,
        email: match.email,
        skills: match.skills,
        experience: match.experience,
        education: match.education,
        similarity: match.similarity,
        reasoning: match.reasoning
      })),
      recommendations,
      totalProfiles: profiles.length,
      processedProfiles: topCandidates.length,
      candidatesWithEmbeddings: candidatesWithEmbeddings.length,
      processingInfo: `Pre-filtered ${profiles.length} profiles to ${topCandidates.length} candidates, generated embeddings for ${candidatesWithEmbeddings.length} profiles.`,
      searchTime: Date.now()
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Search error:', error);
    
    return NextResponse.json({
      error: 'Search failed',
      details: errorMessage
    }, { status: 500 });
  }
}

// Export the authenticated handler
export const POST = withAuth(handlePost);
