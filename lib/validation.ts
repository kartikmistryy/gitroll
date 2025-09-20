import { NextRequest, NextResponse } from 'next/server';

/**
 * Input validation utilities for API endpoints
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

/**
 * Validate LinkedIn URL format
 * @param url - URL to validate
 * @returns ValidationResult
 */
export function validateLinkedInUrl(url: string): ValidationResult {
  const errors: string[] = [];
  
  if (!url || typeof url !== 'string') {
    errors.push('URL is required and must be a string');
    return { isValid: false, errors };
  }

  if (!url.includes('linkedin.com/in/')) {
    errors.push('Please provide a valid LinkedIn profile URL');
  }

  // Basic URL format validation
  try {
    new URL(url);
  } catch {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: url.trim()
  };
}

/**
 * Validate mission statement
 * @param mission - Mission statement to validate
 * @returns ValidationResult
 */
export function validateMissionStatement(mission: string): ValidationResult {
  const errors: string[] = [];
  
  if (!mission || typeof mission !== 'string') {
    errors.push('Mission statement is required and must be a string');
    return { isValid: false, errors };
  }

  const trimmedMission = mission.trim();
  
  if (trimmedMission.length < 10) {
    errors.push('Mission statement must be at least 10 characters long');
  }

  if (trimmedMission.length > 2000) {
    errors.push('Mission statement must be less than 2000 characters');
  }

  // Check for potentially malicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmedMission)) {
      errors.push('Mission statement contains potentially malicious content');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: trimmedMission
  };
}

/**
 * Validate session ID format
 * @param sessionId - Session ID to validate
 * @returns ValidationResult
 */
export function validateSessionId(sessionId: string): ValidationResult {
  const errors: string[] = [];
  
  if (!sessionId || typeof sessionId !== 'string') {
    errors.push('Session ID is required and must be a string');
    return { isValid: false, errors };
  }

  const trimmedSessionId = sessionId.trim();
  
  console.log('Validating session ID:', trimmedSessionId);
  
  // Session ID should follow pattern: operation-userId-timestamp-random
  // Allow alphanumeric characters, hyphens, and underscores
  const sessionIdPattern = /^[a-zA-Z0-9_-]+$/;
  if (!sessionIdPattern.test(trimmedSessionId)) {
    console.log('Session ID pattern test failed for:', trimmedSessionId);
    errors.push('Invalid session ID format');
  }

  if (trimmedSessionId.length < 5 || trimmedSessionId.length > 200) {
    errors.push('Session ID must be between 5 and 200 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: trimmedSessionId
  };
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns ValidationResult
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
    return { isValid: false, errors };
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmedEmail)) {
    errors.push('Invalid email format');
  }

  if (trimmedEmail.length > 254) {
    errors.push('Email must be less than 254 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: trimmedEmail
  };
}

/**
 * Validate file upload
 * @param file - File object to validate
 * @returns ValidationResult
 */
export function validateFileUpload(file: File): ValidationResult {
  const errors: string[] = [];
  
  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  // Check file type
  if (file.type !== 'text/csv') {
    errors.push('File must be a CSV file');
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB');
  }

  // Check file name
  if (!file.name || file.name.length === 0) {
    errors.push('File must have a name');
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: file
  };
}

/**
 * Validate request body JSON
 * @param request - NextRequest object
 * @returns Promise<ValidationResult>
 */
export async function validateRequestBody(request: NextRequest): Promise<ValidationResult> {
  try {
    const body = await request.json();
    return {
      isValid: true,
      errors: [],
      data: body
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Invalid JSON in request body'],
    };
  }
}

/**
 * Create validation error response
 * @param errors - Array of validation errors
 * @returns NextResponse with validation errors
 */
export function createValidationErrorResponse(errors: string[]): NextResponse {
  return NextResponse.json({
    error: 'Validation failed',
    details: errors
  }, { status: 400 });
}

/**
 * Sanitize string input to prevent XSS
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize profile data
 * @param profile - Profile object to validate
 * @returns ValidationResult with sanitized data
 */
export function validateProfileData(profile: any): ValidationResult {
  const errors: string[] = [];
  
  if (!profile || typeof profile !== 'object') {
    errors.push('Profile data is required and must be an object');
    return { isValid: false, errors };
  }

  const sanitizedProfile = {
    name: sanitizeString(profile.name || ''),
    title: sanitizeString(profile.title || ''),
    company: sanitizeString(profile.company || ''),
    location: sanitizeString(profile.location || ''),
    industry: sanitizeString(profile.industry || ''),
    summary: sanitizeString(profile.summary || ''),
    experience: sanitizeString(profile.experience || ''),
    education: sanitizeString(profile.education || ''),
    linkedinUrl: profile.linkedinUrl || '',
    email: profile.email || '',
    skills: Array.isArray(profile.skills) ? profile.skills.map(sanitizeString) : [],
    profilePicture: profile.profilePicture || ''
  };

  // Validate required fields
  if (!sanitizedProfile.name) {
    errors.push('Profile name is required');
  }

  // Validate LinkedIn URL if provided
  if (sanitizedProfile.linkedinUrl) {
    const urlValidation = validateLinkedInUrl(sanitizedProfile.linkedinUrl);
    if (!urlValidation.isValid) {
      errors.push(...urlValidation.errors);
    }
  }

  // Validate email if provided
  if (sanitizedProfile.email) {
    const emailValidation = validateEmail(sanitizedProfile.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedProfile
  };
}
