import { Profile } from './utils';

/**
 * Simple in-memory session storage for profiles
 * This is much faster than database operations
 */

// In-memory storage for user sessions
const sessionStorage = new Map<string, Profile[]>();

/**
 * Store profiles for a session
 */
export function storeSessionProfiles(sessionId: string, profiles: Profile[]): void {
  sessionStorage.set(sessionId, profiles);
  console.log(`Stored ${profiles.length} profiles for session ${sessionId}`);
  console.log(`Total sessions in storage: ${sessionStorage.size}`);
  console.log(`Active session keys:`, Array.from(sessionStorage.keys()));
}

/**
 * Get profiles for a session
 */
export function getSessionProfiles(sessionId: string): Profile[] {
  console.log(`Looking for session ${sessionId}`);
  console.log(`Available sessions:`, Array.from(sessionStorage.keys()));
  const profiles = sessionStorage.get(sessionId) || [];
  console.log(`Getting profiles for session ${sessionId}: ${profiles.length} profiles found`);
  return profiles;
}

/**
 * Clear profiles for a session
 */
export function clearSessionProfiles(sessionId: string): void {
  sessionStorage.delete(sessionId);
  console.log(`Cleared profiles for session ${sessionId}`);
}

/**
 * Get all active sessions (for debugging)
 */
export function getActiveSessions(): string[] {
  return Array.from(sessionStorage.keys());
}

/**
 * Get session count
 */
export function getSessionCount(): number {
  return sessionStorage.size;
}

/**
 * Clean up old sessions (optional - for memory management)
 */
export function cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
  // This is a simple implementation
  // In production, you might want to track timestamps
  const now = Date.now();
  // For now, we'll keep all sessions
  // You can implement timestamp-based cleanup if needed
}
