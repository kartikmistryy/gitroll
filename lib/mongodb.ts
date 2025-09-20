import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Lazy initialization to avoid build-time errors
const getMongoConfig = () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MongoDB URI to environment variables');
  }

  const uri = process.env.MONGODB_URI;
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000, // Increased from 5000 to 30000
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000, // Increased from 10000 to 30000
    retryWrites: true,
    w: 'majority' as const,
    // SSL/TLS options for Vercel compatibility
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    // Additional options for serverless environments
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000,
    // Add retry options
    retryReads: true,
    maxIdleTimeMS: 30000,
  };

  return { uri, options };
};

// Create a new connection for each environment
const createConnection = () => {
  const { uri, options } = getMongoConfig();
  
  return new MongoClient(uri, options);
};

const getClientPromise = (): Promise<MongoClient> => {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = globalThis as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = createConnection();
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, create a new connection for each request
    // This is more reliable for serverless environments like Vercel
    if (!client) {
      client = createConnection();
    }
    return client.connect();
  }
};

// Export a function that returns the client promise
export default getClientPromise;

/**
 * Get MongoDB database instance
 */
export async function getDatabase(): Promise<Db> {
  try {
    // Check if MongoDB URI is configured
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      throw new Error('MongoDB URI not configured. Please set MONGODB_URI environment variable.');
    }

    console.log('Attempting to connect to MongoDB...');
    const clientPromise = getClientPromise();
    const client = await clientPromise;
    
    console.log('MongoDB client connected, testing connection...');
    
    // Test the connection with a longer timeout
    await Promise.race([
      client.db('admin').command({ ping: 1 }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      )
    ]);
    
    console.log('MongoDB connection test successful');
    const db = client.db('linkedin_network_analysis');
    
    // Ensure indexes exist for optimal performance (non-blocking)
    ensureIndexes(db).catch(err => {
      console.warn('Failed to create indexes (non-critical):', err);
    });
    
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('SSL') || error.message.includes('TLS')) {
        throw new Error('MongoDB SSL/TLS connection failed. Please check your connection string and network access settings.');
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        throw new Error('MongoDB connection timeout. Please check your network connection and MongoDB Atlas settings.');
      } else if (error.message.includes('authentication')) {
        throw new Error('MongoDB authentication failed. Please check your username and password.');
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        throw new Error('MongoDB server not found. Please check your connection string and network access.');
      } else if (error.message.includes('MongoDB URI not configured')) {
        throw error; // Re-throw the specific error
      }
    }
    
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ensure database indexes exist for optimal performance
 */
async function ensureIndexes(db: Db): Promise<void> {
  try {
    const profilesCollection = db.collection('profiles');
    const usersCollection = db.collection('users');
    
    // Create indexes for profiles collection
    await profilesCollection.createIndex({ userId: 1 }); // User isolation
    await profilesCollection.createIndex({ uploadSessionId: 1, userId: 1 }); // Session queries
    await profilesCollection.createIndex({ uniqueKey: 1 }, { unique: true }); // Duplicate prevention
    await profilesCollection.createIndex({ name: 1, company: 1, userId: 1 }); // Search queries
    await profilesCollection.createIndex({ linkedinUrl: 1, userId: 1 }); // URL lookups
    await profilesCollection.createIndex({ uploadedAt: -1 }); // Time-based queries
    await profilesCollection.createIndex({ lastUpdated: -1 }); // Update tracking
    
    // Create indexes for users collection
    await usersCollection.createIndex({ email: 1 }, { unique: true }); // User lookup
    await usersCollection.createIndex({ createdAt: -1 }); // Time-based queries
    await usersCollection.createIndex({ updatedAt: -1 }); // Update tracking
    
    console.log('Database indexes ensured successfully');
  } catch (error) {
    console.error('Error creating database indexes:', error);
    // Don't throw error as this is not critical for basic functionality
  }
}

/**
 * User data schema interfaces
 */
export interface UserProfile {
  _id?: string;
  email: string;
  name: string;
  imageUrl?: string;
  matches: UserMatch[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedInProfile {
  _id?: string;
  id: string;
  userId: string; // Add user isolation
  name: string;
  title?: string;
  company: string;
  location: string;
  industry: string;
  linkedinUrl: string;
  summary: string;
  profilePicture?: string;
  email?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  uploadSessionId?: string;
  embedding?: number[];
  uploadedAt: Date;
  lastUpdated: Date;
  // Add unique constraints for duplicate prevention
  uniqueKey: string; // Combination of name, company, and userId for deduplication
}

export interface UserMatch {
  id: string;
  mission: string;
  matches: MatchResult[];
  recommendations: string;
  createdAt: Date;
}

export interface MatchResult {
  id: string;
  name: string;
  title?: string;
  company: string;
  location: string;
  industry: string;
  linkedinUrl: string;
  summary: string;
  profilePicture?: string;
  email?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  similarity: number;
}
