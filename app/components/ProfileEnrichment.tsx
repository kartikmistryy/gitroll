'use client';

import { useState } from 'react';

interface ProfileEnrichmentProps {
  sessionId: string;
  onEnrichmentComplete: (enrichedCount: number) => void;
}

export default function ProfileEnrichment({ sessionId, onEnrichmentComplete }: ProfileEnrichmentProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState<string>('');

  const handleEnrichProfiles = async () => {
    setIsEnriching(true);
    setEnrichmentStatus('Starting enrichment...');

    try {
      const response = await fetch('/api/enrich-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          options: {
            maxConcurrent: 3,
            delayBetweenRequests: 1000,
            timeout: 30000
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEnrichmentStatus(`✅ Successfully enriched ${data.enrichedProfiles} out of ${data.totalProfiles} profiles`);
        onEnrichmentComplete(data.enrichedProfiles);
      } else {
        setEnrichmentStatus(`❌ Enrichment failed: ${data.error}`);
      }
    } catch (error) {
      setEnrichmentStatus(`❌ Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        📈 Profile Data Enrichment
      </h3>
      <p className="text-blue-700 mb-4">
        Enhance your CSV profiles with additional data from LinkedIn URLs. This will add:
      </p>
      <ul className="text-blue-700 text-sm mb-4 space-y-1">
        <li>• Profile pictures and detailed summaries</li>
        <li>• Skills, experience, and education details</li>
        <li>• Location and industry information</li>
        <li>• Better data for AI matching</li>
      </ul>
      
      <button
        onClick={handleEnrichProfiles}
        disabled={isEnriching}
        className={`px-4 py-2 rounded-md font-medium ${
          isEnriching
            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isEnriching ? 'Enriching Profiles...' : 'Enrich Profiles'}
      </button>

      {enrichmentStatus && (
        <div className="mt-3 p-3 bg-white rounded border">
          <p className="text-sm">{enrichmentStatus}</p>
        </div>
      )}
    </div>
  );
}
