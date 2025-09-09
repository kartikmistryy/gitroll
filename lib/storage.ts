import { Profile } from './utils';
import { getDatabase, LinkedInProfile } from './mongodb';

// Load profiles from MongoDB
export const loadProfiles = async (): Promise<Profile[]> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    const profiles = await profilesCollection.find({}).toArray();
    
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
    return [];
  }
};

// Save profiles to MongoDB
export const saveProfiles = async (profiles: Profile[]): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    
    // Convert Profile to LinkedInProfile format and upsert
    for (const profile of profiles) {
      const linkedinProfile: LinkedInProfile = {
        id: profile.id,
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
        uploadedAt: new Date()
      };
      
      await profilesCollection.replaceOne(
        { id: profile.id },
        linkedinProfile,
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Error saving profiles to MongoDB:', error);
  }
};

// Add a single profile
export const addProfile = async (profile: Profile): Promise<void> => {
  const profiles = await loadProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);
};

// Add multiple profiles efficiently (without loading all existing profiles)
export const addProfiles = async (newProfiles: Profile[]): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    
    // Convert Profile to LinkedInProfile format and insert directly
    const linkedinProfiles: LinkedInProfile[] = newProfiles.map(profile => ({
      id: profile.id,
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
      uploadedAt: new Date()
    }));
    
    // Insert all profiles in a single operation
    await profilesCollection.insertMany(linkedinProfiles);
  } catch (error) {
    console.error('Error adding profiles to MongoDB:', error);
    throw error;
  }
};

// Get all profiles (async version)
export const getAllProfiles = async (): Promise<Profile[]> => {
  return await loadProfiles();
};

// Get profiles by upload session
export const getProfilesBySession = async (sessionId: string): Promise<Profile[]> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    const profiles = await profilesCollection.find({ uploadSessionId: sessionId }).toArray();
    
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

// Clear all profiles
export const clearProfiles = async (): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    await profilesCollection.deleteMany({});
  } catch (error) {
    console.error('Error clearing profiles from MongoDB:', error);
  }
};

// Clear profiles by session
export const clearProfilesBySession = async (sessionId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    const profilesCollection = db.collection<LinkedInProfile>('profiles');
    await profilesCollection.deleteMany({ uploadSessionId: sessionId });
  } catch (error) {
    console.error('Error clearing profiles by session from MongoDB:', error);
  }
};
