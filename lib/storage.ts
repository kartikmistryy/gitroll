import { Profile } from './utils';
import { getDatabase, LinkedInProfile } from './mongodb';

// Load profiles from MongoDB for a specific user
export const loadProfiles = async (userId: string): Promise<Profile[]> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    const profiles = await profilesCollection.find({ userId }).toArray();
    
    // Convert LinkedInProfile to Profile format
    return profiles.map((profile: LinkedInProfile) => ({
      id: profile.id,
      name: profile.name,
      title: profile.title,
      company: profile.company,
      location: profile.location,
      industry: profile.industry,
      linkedinUrl: profile.linkedinUrl,
      email: profile.email,
      summary: profile.summary,
      experience: profile.experience,
      education: profile.education,
      skills: profile.skills,
      profilePicture: profile.profilePicture,
      uploadSessionId: profile.uploadSessionId,
      embedding: profile.embedding || [] // Preserve existing embeddings
    }));
  } catch (error) {
    console.error('Error loading profiles from MongoDB:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

// Save profiles to MongoDB with user isolation and duplicate prevention
export const saveProfiles = async (profiles: Profile[], userId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    
    console.log(`Saving ${profiles.length} profiles to database for user ${userId}...`);
    
    // Convert Profile to LinkedInProfile format and upsert with duplicate prevention
    for (const profile of profiles) {
      const uniqueKey = `${userId}-${profile.name.toLowerCase().trim()}-${(profile.company || 'unknown').toLowerCase().trim()}`;
      
      const linkedinProfile: LinkedInProfile = {
        id: profile.id,
        userId: userId,
        name: profile.name,
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        industry: profile.industry || '',
        linkedinUrl: profile.linkedinUrl || '',
        email: profile.email || '',
        summary: profile.summary || '',
        experience: profile.experience || '',
        education: profile.education || '',
        skills: profile.skills || [],
        profilePicture: profile.profilePicture || '',
        uploadSessionId: profile.uploadSessionId,
        embedding: profile.embedding,
        uploadedAt: new Date(),
        lastUpdated: new Date(),
        uniqueKey: uniqueKey
      };
      
      // Use uniqueKey for upsert to prevent duplicates
      const result = await profilesCollection.replaceOne(
        { uniqueKey: uniqueKey },
        linkedinProfile,
        { upsert: true }
      );
      
      if (profile.embedding && profile.embedding.length > 0) {
        console.log(`Saved profile ${profile.name} with embedding (${profile.embedding.length} dimensions)`);
      }
    }
    
    console.log('All profiles saved successfully');
  } catch (error) {
    console.error('Error saving profiles to MongoDB:', error);
    throw error;
  }
};

// Add a single profile with user isolation and duplicate prevention
export const addProfile = async (profile: Profile, userId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    
    const uniqueKey = `${userId}-${profile.name.toLowerCase().trim()}-${(profile.company || 'unknown').toLowerCase().trim()}`;
    
    const linkedinProfile: LinkedInProfile = {
      id: profile.id,
      userId: userId,
      name: profile.name,
      title: profile.title || '',
      company: profile.company || '',
      location: profile.location || '',
      industry: profile.industry || '',
      linkedinUrl: profile.linkedinUrl || '',
      email: profile.email || '',
      summary: profile.summary || '',
      experience: profile.experience || '',
      education: profile.education || '',
      skills: profile.skills || [],
      profilePicture: profile.profilePicture || '',
      uploadSessionId: profile.uploadSessionId,
      embedding: profile.embedding,
      uploadedAt: new Date(),
      lastUpdated: new Date(),
      uniqueKey: uniqueKey
    };
    
    // Use uniqueKey for upsert to prevent duplicates
    await profilesCollection.replaceOne(
      { uniqueKey: uniqueKey },
      linkedinProfile,
      { upsert: true }
    );
  } catch (error) {
    console.error('Error adding profile to MongoDB:', error);
    throw error;
  }
};

// Add multiple profiles efficiently with user isolation and duplicate prevention
export const addProfiles = async (newProfiles: Profile[], userId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    
    // Convert Profile to LinkedInProfile format with duplicate prevention
    const linkedinProfiles: LinkedInProfile[] = newProfiles.map(profile => {
      const uniqueKey = `${userId}-${profile.name.toLowerCase().trim()}-${(profile.company || 'unknown').toLowerCase().trim()}`;
      
      return {
        id: profile.id,
        userId: userId,
        name: profile.name,
        title: profile.title || '',
        company: profile.company || '',
        location: profile.location || '',
        industry: profile.industry || '',
        linkedinUrl: profile.linkedinUrl || '',
        email: profile.email || '',
        summary: profile.summary || '',
        experience: profile.experience || '',
        education: profile.education || '',
        skills: profile.skills || [],
        profilePicture: profile.profilePicture || '',
        uploadSessionId: profile.uploadSessionId,
        embedding: profile.embedding,
        uploadedAt: new Date(),
        lastUpdated: new Date(),
        uniqueKey: uniqueKey
      };
    });
    
    // Use bulkWrite for efficient upsert operations
    const operations = linkedinProfiles.map(profile => ({
      replaceOne: {
        filter: { uniqueKey: profile.uniqueKey },
        replacement: profile,
        upsert: true
      }
    }));
    
    await profilesCollection.bulkWrite(operations);
  } catch (error) {
    console.error('Error adding profiles to MongoDB:', error);
    throw error;
  }
};

// Get all profiles for a specific user (async version)
export const getAllProfiles = async (userId: string): Promise<Profile[]> => {
  return await loadProfiles(userId);
};

// Get profiles by upload session with user isolation
export const getProfilesBySession = async (sessionId: string, userId: string): Promise<Profile[]> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    const profiles = await profilesCollection.find({ 
      uploadSessionId: sessionId,
      userId: userId 
    }).toArray();
    
    console.log(`Loaded ${profiles.length} profiles for session ${sessionId} and user ${userId}`);
    const profilesWithEmbeddings = profiles.filter((p: LinkedInProfile) => p.embedding && p.embedding.length > 0);
    console.log(`${profilesWithEmbeddings.length} profiles have embeddings`);
    
    // Convert LinkedInProfile to Profile format
    return profiles.map((profile: LinkedInProfile) => ({
      id: profile.id,
      name: profile.name,
      title: profile.title,
      company: profile.company,
      location: profile.location,
      industry: profile.industry,
      linkedinUrl: profile.linkedinUrl,
      email: profile.email,
      summary: profile.summary,
      experience: profile.experience,
      education: profile.education,
      skills: profile.skills,
      profilePicture: profile.profilePicture,
      uploadSessionId: profile.uploadSessionId,
      embedding: profile.embedding || [] // Preserve existing embeddings
    }));
  } catch (error) {
    console.error('Error loading profiles by session from MongoDB:', error);
    return [];
  }
};

// Clear all profiles for a specific user
export const clearProfiles = async (userId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    await profilesCollection.deleteMany({ userId });
  } catch (error) {
    console.error('Error clearing profiles from MongoDB:', error);
  }
};

// Clear profiles by session with user isolation
export const clearProfilesBySession = async (sessionId: string, userId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    await profilesCollection.deleteMany({ 
      uploadSessionId: sessionId,
      userId: userId 
    });
  } catch (error) {
    console.error('Error clearing profiles by session from MongoDB:', error);
  }
};
