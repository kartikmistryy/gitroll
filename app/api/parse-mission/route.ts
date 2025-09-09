import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * Mission Statement Parser API
 * 
 * Uses Azure OpenAI GPT to analyze mission statements and extract structured attributes:
 * - Industry: Primary industry or sector
 * - Location: Geographic location or region  
 * - Role: Type of role or relationship being sought
 * - Description: Brief summary of the mission
 * 
 * @param request - Contains mission statement in JSON body
 * @returns Structured attributes extracted from the mission
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { mission } = await request.json();

    // Validate input
    if (!mission || mission.trim().length === 0) {
      return NextResponse.json({ error: 'Mission statement is required' }, { status: 400 });
    }

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

    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

    // Create structured prompt for attribute extraction
    const prompt = `
Analyze the following mission statement and extract key attributes in JSON format.

Mission: "${mission}"

Extract and return ONLY a valid JSON object with these exact fields:
{
  "industry": "the primary industry or sector",
  "location": "the geographic location or region", 
  "role": "the type of role or relationship being sought",
  "description": "a brief summary of the mission"
}

CRITICAL: Return ONLY the JSON object. No explanations, no markdown, no additional text. Just the raw JSON.
`;

    // Call Azure OpenAI for mission analysis
    const response = await openai.chat.completions.create({
      model: deploymentName,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing business mission statements and extracting structured data. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent, structured output
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json({ 
        error: 'Failed to parse mission statement' 
      }, { status: 500 });
    }

    // Parse the JSON response
    let attributes;
    try {
      // Try to parse the content directly
      attributes = JSON.parse(content);
    } catch {
      // If direct parsing fails, try to extract JSON from the response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          attributes = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch {
        return NextResponse.json({ 
          error: 'Invalid response format from AI service'
        }, { status: 500 });
      }
    }

    // Validate required fields
    const requiredFields = ['industry', 'location', 'role', 'description'];
    for (const field of requiredFields) {
      if (!attributes[field]) {
        attributes[field] = 'Not specified';
      }
    }

    return NextResponse.json({
      success: true,
      attributes,
      originalMission: mission
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to parse mission statement',
      details: errorMessage
    }, { status: 500 });
  }
}