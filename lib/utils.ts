// Import persistent storage functions
import { addProfile, addProfiles, getAllProfiles, clearProfiles, saveProfiles, getProfilesBySession, clearProfilesBySession } from './storage';

// Re-export storage functions (now async)
export { addProfile, addProfiles, getAllProfiles, clearProfiles, saveProfiles, getProfilesBySession, clearProfilesBySession };

/**
 * Profile Interface
 * Represents a LinkedIn profile with all relevant information
 */
export interface Profile {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  linkedinUrl?: string;
  email?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  profilePicture?: string;
  embedding?: number[]; // Vector embedding for similarity matching
  uploadSessionId?: string; // Track which upload session this profile belongs to
}

/**
 * Mission Attributes Interface
 * Structured attributes extracted from mission statements
 */
export interface MissionAttributes {
  industry: string;
  location: string;
  role: string;
  description: string;
}

/**
 * Profile with Embedding Interface
 * Used for similarity matching calculations
 */
export interface ProfileWithEmbedding {
  profile: Profile;
  similarity: number;
}

/**
 * Match Result Interface
 * Result of profile matching with similarity score
 */
export interface MatchResult {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  linkedinUrl?: string;
  summary?: string;
  similarity: number;
  reasoning?: string;
}

/**
 * Calculate cosine similarity between two vectors
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity score (0-1, where 1 is identical)
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Find top N profiles with highest similarity to mission embedding
 * 
 * @param missionEmbedding - Vector embedding of the mission statement
 * @param profiles - Array of profiles to search through
 * @param topN - Number of top matches to return
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Array of top matching profiles with similarity scores
 */
export const findTopMatches = (
  missionEmbedding: number[], 
  profiles: Profile[], 
  topN: number = 5,
  minSimilarity: number = 0.0
): MatchResult[] => {
  const profilesWithSimilarity: ProfileWithEmbedding[] = [];
  const seenProfiles = new Set<string>(); // Track seen profiles to avoid duplicates

  // Calculate similarity for each profile
  for (const profile of profiles) {
    if (profile.embedding && profile.embedding.length > 0) {
      // Create a unique key for deduplication based on name and company
      const profileKey = `${profile.name.toLowerCase().trim()}-${(profile.company || 'unknown').toLowerCase().trim()}`;
      
      // Skip if we've already seen this person
      if (seenProfiles.has(profileKey)) {
        continue;
      }
      
      seenProfiles.add(profileKey);
      
      const similarity = cosineSimilarity(missionEmbedding, profile.embedding);
      
      // Only include profiles that meet the minimum similarity threshold
      if (similarity >= minSimilarity) {
        profilesWithSimilarity.push({
          profile,
          similarity
        });
      }
    }
  }

  // Sort by similarity (highest first) and return top N
  return profilesWithSimilarity
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
    .map(({ profile, similarity }) => ({
      id: profile.id,
      name: profile.name,
      title: profile.title,
      company: profile.company,
      location: profile.location,
      industry: profile.industry,
      linkedinUrl: profile.linkedinUrl,
      summary: profile.summary,
      similarity
    }));
};

/**
 * Generate text representation of a profile for embedding
 * Combines all relevant profile information into a single string
 * 
 * @param profile - Profile object to convert to text
 * @returns Text representation of the profile
 */
export const generateProfileText = (profile: Profile): string => {
  const parts = [
    profile.name,
    profile.title,
    profile.company,
    profile.location,
    profile.industry,
    profile.summary,
    profile.experience,
    profile.education,
    profile.skills?.join(', ')
  ].filter(Boolean);

  return parts.join(' ');
};

/**
 * Generate text representation of mission for embedding
 * Combines mission statement with extracted attributes
 * 
 * @param mission - Original mission statement
 * @param attributes - Extracted mission attributes
 * @returns Text representation of the mission
 */
export const generateMissionText = (mission: string, attributes: MissionAttributes): string => {
  return `${mission} Industry: ${attributes.industry} Location: ${attributes.location} Role: ${attributes.role}`;
};

/**
 * Parse LinkedIn CSV data into structured Profile objects
 * Handles various LinkedIn export formats and field name variations
 * 
 * @param csvData - Raw CSV data from LinkedIn export
 * @param sessionId - Upload session ID to track this batch
 * @returns Array of structured Profile objects
 */
export const parseLinkedInCSV = (csvData: Record<string, string>[], sessionId?: string): Profile[] => {
  return csvData.map((row, index) => {
    // Handle different possible field names from LinkedIn exports
    const firstName = row["First Name"] || row["first_name"] || row["First name"] || "";
    const lastName = row["Last Name"] || row["last_name"] || row["Last name"] || "";
    const jobTitle = row["Position"] || row["Job Title"] || row["Title"] || row["position"] || row["job_title"] || "";
    const company = row["Company"] || row["company"] || row["Organization"] || row["organization"] || "";
    const location = row["Location"] || row["location"] || row["City"] || row["city"] || "";
    const industry = row["Industry"] || row["industry"] || row["Sector"] || row["sector"] || "";
    const linkedinUrl = row["URL"] || row["LinkedIn URL"] || row["Profile URL"] || row["url"] || row["linkedin_url"] || "";
    const email = row["Email Address"] || row["email"] || row["Email"] || "";

    return {
      id: `csv-${index}-${Date.now()}`,
      name: `${firstName} ${lastName}`.trim(),
      title: jobTitle,
      company: company,
      location: location,
      industry: industry,
      linkedinUrl: linkedinUrl,
      email: email,
      summary: `${jobTitle} at ${company}`,
      experience: `${jobTitle} at ${company}`,
      education: "",
      skills: [],
      uploadSessionId: sessionId
    };
  });
};

/**
 * Convert RapidAPI LinkedIn profile data to Profile object
 * 
 * @param rapidApiData - Raw data from RapidAPI LinkedIn scraper
 * @param url - Original LinkedIn URL
 * @returns Structured Profile object
 */
export const convertRapidAPIProfile = (rapidApiData: Record<string, unknown>, url: string): Profile => {
  // Helper function to safely convert unknown to string
  const toString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  // Helper function to safely convert unknown to string array
  const toStringArray = (value: unknown): string[] => {
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
  };

  return {
    id: `rapidapi-${Date.now()}`,
    name: toString(rapidApiData.name) || 'Unknown',
    title: toString(rapidApiData.title) || toString(rapidApiData.headline) || '',
    company: toString(rapidApiData.company) || toString(rapidApiData.current_company) || '',
    location: toString(rapidApiData.location) || '',
    industry: toString(rapidApiData.industry) || '',
    linkedinUrl: url,
    email: toString(rapidApiData.email) || '',
    summary: toString(rapidApiData.summary) || toString(rapidApiData.about) || '',
    experience: toString(rapidApiData.experience) || '',
    education: toString(rapidApiData.education) || '',
    skills: toStringArray(rapidApiData.skills),
    profilePicture: toString(rapidApiData.profilePicture) || toString(rapidApiData.avatar) || toString(rapidApiData.image) || ''
  };
};