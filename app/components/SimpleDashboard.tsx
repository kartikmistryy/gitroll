'use client';

import { useState, useRef } from 'react';

interface Profile {
  id: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  linkedinUrl?: string;
  summary?: string;
  profilePicture?: string;
  email?: string;
  skills?: string[];
  similarity: number;
}

export default function SimpleDashboard() {
  const [sessionId, setSessionId] = useState<string>('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<Profile[]>([]);
  const [recommendations, setRecommendations] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.sessionId);
        setProfiles([]); // Clear previous results
        setMatches([]);
        alert(`✅ Successfully uploaded ${data.totalCount} profiles!`);
      } else {
        alert(`❌ Upload failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Upload failed: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!sessionId || !searchQuery.trim()) {
      alert('Please upload a CSV file and enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/search-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mission: searchQuery,
          sessionId: sessionId,
          attributes: {
            industry: 'Technology',
            location: 'Global',
            role: 'Professional',
            description: searchQuery
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMatches(data.matches);
        setRecommendations(data.recommendations);
      } else {
        alert(`❌ Search failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Search failed: ${error}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearProfiles = async () => {
    if (!sessionId) {
      alert('No session to clear');
      return;
    }

    try {
      const response = await fetch('/api/clear-profiles', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSessionId('');
        setProfiles([]);
        setMatches([]);
        setRecommendations('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert('✅ Profiles cleared successfully!');
      } else {
        alert(`❌ Clear failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Clear failed: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🚀 LinkedIn Network Analyzer
        </h1>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📁 Upload Connections CSV</h2>
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button
              onClick={handleClearProfiles}
              disabled={!sessionId || isUploading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>
          {sessionId && (
            <p className="mt-2 text-sm text-green-600">
              ✅ Session active: {sessionId}
            </p>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Search Profiles</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Describe what you're looking for... (e.g., 'Find data scientists in AI companies')"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={!sessionId || !searchQuery.trim() || isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {matches.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🎯 Search Results</h2>
            
            {recommendations && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">AI Recommendations:</h3>
                <p className="text-blue-800">{recommendations}</p>
              </div>
            )}

            <div className="grid gap-4">
              {matches.map((profile, index) => (
                <div key={profile.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    {profile.profilePicture ? (
                      <img
                        src={profile.profilePicture}
                        alt={profile.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 text-xl">
                          {profile.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{profile.name}</h3>
                        <span className="text-sm text-blue-600 font-medium">
                          {(profile.similarity * 100).toFixed(1)}% match
                        </span>
                      </div>
                      
                      <p className="text-gray-600 font-medium">{profile.title}</p>
                      <p className="text-gray-500">{profile.company}</p>
                      
                      {profile.location && (
                        <p className="text-sm text-gray-500">📍 {profile.location}</p>
                      )}
                      
                      {profile.industry && (
                        <p className="text-sm text-gray-500">🏢 {profile.industry}</p>
                      )}
                      
                      {profile.summary && (
                        <p className="text-sm text-gray-700 mt-2">{profile.summary}</p>
                      )}
                      
                      {profile.skills && profile.skills.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {profile.skills.slice(0, 5).map((skill, skillIndex) => (
                              <span
                                key={skillIndex}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                            {profile.skills.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                +{profile.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {profile.linkedinUrl && (
                        <a
                          href={profile.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View LinkedIn Profile →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
