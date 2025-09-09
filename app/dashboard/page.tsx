"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiMenu, 
  FiX, 
  FiUpload, 
  FiUser, 
  FiUsers, 
  FiCheck, 
  FiAlertCircle,
  FiLogOut
} from "react-icons/fi";
import { useUser, UserButton, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Types for better type safety
interface UploadStatus {
  type: 'success' | 'error';
  message: string;
}

interface Match {
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
  similarity?: number;
  reasoning?: string;
}

/**
 * LinkedIn Network Analysis Dashboard
 * 
 * Features:
 * - CSV file upload for bulk profile import
 * - Single LinkedIn URL scraping
 * - AI-powered mission statement analysis
 * - Vector similarity matching using embeddings
 * - Intelligent networking recommendations
 */
export default function Dashboard() {
  // Authentication
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mission, setMission] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [recommendations, setRecommendations] = useState("");
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect unauthenticated users and load user data
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    } else if (isLoaded && user) {
      const loadUserData = async () => {
        try {
          const response = await fetch(`/api/load-user-data?email=${encodeURIComponent(user.primaryEmailAddress?.emailAddress || '')}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.matches?.length > 0) {
              const latestMatch = data.data.matches[data.data.matches.length - 1];
              setMatches(latestMatch.matches || []);
              setRecommendations(latestMatch.recommendations || '');
              setMission(latestMatch.mission || '');
            }
          }
        } catch {
          // Silently handle error - user can still use the app
        }
      };
      loadUserData();
    }
  }, [isLoaded, user, router]);


  /**
   * Save user matches to MongoDB
   */
  const saveUserMatches = async (matches?: Match[], recommendations?: string, mission?: string): Promise<void> => {
    if (!user?.primaryEmailAddress?.emailAddress || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/save-user-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.primaryEmailAddress.emailAddress,
          name: user.fullName,
          imageUrl: user.imageUrl,
          matches,
          recommendations,
          mission,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        // Silently handle error - matches will still be displayed
      }
    } catch {
      // Silently handle error - matches will still be displayed
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  /**
   * Handles CSV file upload and processing
   */
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "text/csv") {
      setUploadStatus({ type: 'error', message: 'Please select a valid CSV file' });
      return;
    }

    setIsLoading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus({ 
          type: 'success', 
          message: `Successfully imported ${result.totalCount} profiles`
        });
        setTotalProfiles(result.totalCount);
        setCurrentSessionId(result.sessionId);
      } else {
        setUploadStatus({ type: 'error', message: result.error || 'Upload failed' });
      }
    } catch {
      setUploadStatus({ type: 'error', message: 'Failed to upload file' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear all profiles from the database
   */
  const handleClearProfiles = async (): Promise<void> => {
    if (!confirm('Are you sure you want to clear all profiles? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setUploadStatus(null);

    try {
      const response = await fetch('/api/clear-profiles', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus({ 
          type: 'success', 
          message: 'All profiles cleared successfully' 
        });
        setTotalProfiles(0);
        setCurrentSessionId(null);
      } else {
        setUploadStatus({ type: 'error', message: result.error || 'Failed to clear profiles' });
      }
    } catch {
      setUploadStatus({ type: 'error', message: 'Failed to clear profiles' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Main function to find matches using AI
   * 1. Parses mission statement to extract attributes
   * 2. Generates embeddings for semantic matching
   * 3. Finds top matches using cosine similarity
   * 4. Generates intelligent recommendations
   */
  const handleFindMatches = async (): Promise<void> => {
    if (!mission.trim()) {
      setUploadStatus({ type: 'error', message: 'Please enter your mission statement' });
      return;
    }

    if (totalProfiles === 0) {
      setUploadStatus({ type: 'error', message: 'Please upload profiles first' });
      return;
    }

    if (isLoading) {
      return; // Prevent multiple simultaneous calls
    }

    setIsLoading(true);
    setUploadStatus(null);

    try {
      // Step 1: Parse mission statement using AI
      const missionResponse = await fetch('/api/parse-mission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mission }),
      });

      const missionResult = await missionResponse.json();

      if (!missionResult.success) {
        setUploadStatus({ type: 'error', message: missionResult.error || 'Failed to parse mission' });
        return;
      }

      // Step 2: Find matches using vector similarity
      const matchesResponse = await fetch('/api/match-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mission, 
          attributes: missionResult.attributes,
          sessionId: currentSessionId
        }),
      });

      const matchesResult = await matchesResponse.json();

      if (matchesResult.success) {
        // Auto-scrape LinkedIn profiles for the matches
        const enrichedMatches = await Promise.all(
          matchesResult.matches.map(async (match: Match) => {
            if (match.linkedinUrl) {
              try {
                const scrapeResponse = await fetch('/api/scrape-profile', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ url: match.linkedinUrl }),
                });
                
                const scrapeResult = await scrapeResponse.json();
                if (scrapeResult.success && scrapeResult.profile) {
                  return {
                    ...match,
                    profilePicture: scrapeResult.profile.profilePicture,
                    email: scrapeResult.profile.email,
                    experience: scrapeResult.profile.experience,
                    education: scrapeResult.profile.education,
                    skills: scrapeResult.profile.skills,
                    title: scrapeResult.profile.title || match.title,
                    summary: scrapeResult.profile.summary || match.summary
                  };
                }
              } catch {
                // Continue with original profile data if scraping fails
              }
            }
            return match;
          })
        );
        
        setMatches(enrichedMatches);
        setRecommendations(matchesResult.recommendations);
        setUploadStatus({ 
          type: 'success', 
          message: `Found ${matchesResult.matches.length} high-quality matches with detailed reasoning` 
        });
        
        // Save matches to MongoDB
        await saveUserMatches(enrichedMatches, matchesResult.recommendations, mission);
      } else {
        setUploadStatus({ type: 'error', message: matchesResult.error || 'Failed to find matches' });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find matches';
      setUploadStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="z-30 md:w-80 w-full bg-white shadow-lg md:shadow-none border-r border-gray-200 h-screen md:h-screen fixed md:top-0 top-10 left-0"
            >
              <div className="p-5 h-full flex flex-col">
                {/* Dashboard Title */}
                {/* <div className="mb-8 p-5">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
                  <p className="text-gray-600">LinkedIn Network Analysis</p>
                </div> */}

                {/* User Profile Card */}
                <div className="rounded-lg p-4 mb-6 text-black">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {user.imageUrl ? (
                        <div className="w-12 h-12">
                          <UserButton 
                            appearance={{
                              elements: {
                                avatarBox: "w-full h-full !w-full !h-full",
                                userButtonPopoverCard: "bg-white",
                                userButtonPopoverActionButton: "text-gray-700 hover:bg-gray-100"
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <FiUser size={24} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{user.fullName || 'User'}</h3>
                        <p className="text-sm opacity-90">{user.primaryEmailAddress?.emailAddress}</p>
                      </div>
                    </div>
                    
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Data Import</h3>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        onClick={handleFileUpload}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                      >
                        <FiUpload className="mr-2" />
                        {isLoading ? 'Uploading...' : 'Upload CSV File'}
                      </button>
                      {totalProfiles > 0 && (
                        <button
                          onClick={handleClearProfiles}
                          disabled={isLoading}
                          className="px-4 py-3 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500">
                      Upload your LinkedIn connections CSV file
                      {totalProfiles > 0 && (
                        <span className="block mt-1 text-green-600">
                          ✓ {totalProfiles} profiles ready for matching
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Status Display */}
                {uploadStatus && (
                  <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                    uploadStatus.type === 'success' 
                      ? 'bg-gray-50 text-black border border-gray-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {uploadStatus.type === 'success' ? (
                      <FiCheck className="text-gray-600" />
                    ) : (
                      <FiAlertCircle className="text-red-600" />
                    )}
                    <span className="text-sm">{uploadStatus.message}</span>
                  </div>
                )}

                {/* Profile Count */}
                {totalProfiles > 0 && (
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FiUsers className="text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {totalProfiles} profiles loaded
                      </span>
                    </div>
                  </div>
                )}

                {/* Logout Button */}
                <div className="mt-auto pt-6">
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center justify-center px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiLogOut className="mr-2" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 ml-80">
          <div className="max-w-4xl mx-auto p-5">
            {/* Welcome Section */}
            <div className="mb-8 mt-5">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome {user.fullName || 'User'} !
              </h2>
              <p className="text-gray-600">
                Upload your LinkedIn connections and discover meaningful networking opportunities using AI-powered matching.
              </p>
            </div>

            {/* Mission Input Section */}
            <div className="rounded-lg mb-5">
              <p className="text-gray-600 mb-4">
                Describe your networking goals. Our AI will analyze your mission and find the most relevant connections.
              </p>
              <textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="e.g., I'm looking for tech entrepreneurs in San Francisco who are building AI startups..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleFindMatches}
                  disabled={isLoading || !mission.trim() || totalProfiles === 0}
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Finding Matches...</span>
                      <span className="text-xs opacity-75 ml-2">(AI analyzing {totalProfiles} profiles)</span>
                    </>
                  ) : (
                    <>
                      <span>Find Matches</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Section */}
            {matches.length > 0 && (
              <div className="space-y-6">
                {/* Matches List */}
                <div className="rounded-lg pt-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Top Matches ({matches.length})
                  </h3>
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start space-x-4">
                          {/* Profile Picture */}
                          <div className="flex-shrink-0">
                            {match.profilePicture ? (
                              <img
                                src={match.profilePicture}
                                alt={match.name}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center ${match.profilePicture ? 'hidden' : ''}`}>
                              <FiUser className="w-6 h-6 text-gray-500" />
                            </div>
                          </div>
                          
                          {/* Profile Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">{match.name}</h4>
                              {match.similarity && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">Match Score:</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    match.similarity >= 0.7 ? 'bg-green-100 text-green-800' :
                                    match.similarity >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {(match.similarity * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm">{match.title}</p>
                            <p className="text-gray-900 text-sm font-semibold">{match.company}</p>
                            <p className="text-gray-500 text-xs mt-1">{match.location}  {match.industry}</p>
                            
                            {/* Reasoning */}
                            {match.reasoning && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                <p className="text-sm text-blue-800 font-medium mb-1">Why this match:</p>
                                <p className="text-sm text-blue-700">{match.reasoning}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Connect Button */}
                          <div className="flex-shrink-0">
                            <a
                              href={match.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                            >
                              Connect
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>                
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}