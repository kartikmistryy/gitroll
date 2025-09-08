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
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority' as const,
    // SSL/TLS options for Vercel compatibility
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    // Additional options for serverless environments
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000,
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
    // This is more reliable for serverless environments
    client = createConnection();
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
    const clientPromise = getClientPromise();
    const client = await clientPromise;
    
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    
    return client.db('linkedin_network_analysis');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('SSL') || error.message.includes('TLS')) {
        throw new Error('MongoDB SSL/TLS connection failed. Please check your connection string and network access settings.');
      } else if (error.message.includes('timeout')) {
        throw new Error('MongoDB connection timeout. Please check your network connection and MongoDB Atlas settings.');
      } else if (error.message.includes('authentication')) {
        throw new Error('MongoDB authentication failed. Please check your username and password.');
      }
    }
    
    throw new Error('Database connection failed');
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
  uploadedAt: Date;
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
