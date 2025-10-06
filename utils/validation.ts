import { ValidationError } from '@/types/errors';

/**
 * Validates if a string is a valid URI
 */
export function validateImageUri(uri: string): void {
  if (!uri || typeof uri !== 'string') {
    throw new ValidationError('Image URI is required', 'imageUri');
  }

  const validPrefixes = ['file://', 'content://', 'http://', 'https://', 'data:'];
  const isValid = validPrefixes.some(prefix => uri.startsWith(prefix));

  if (!isValid) {
    throw new ValidationError('Invalid image URI format', 'imageUri');
  }
}

/**
 * Validates email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required', 'email');
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required', 'password');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters', 'password');
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    throw new ValidationError(
      'Password must contain uppercase, lowercase, and numbers',
      'password'
    );
  }
}

/**
 * Validates plant identification data
 */
export function validatePlantData(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid plant data');
  }

  const plantData = data as Record<string, unknown>;

  if (!plantData.commonName || typeof plantData.commonName !== 'string') {
    throw new ValidationError('Plant common name is required', 'commonName');
  }

  if (!plantData.scientificName || typeof plantData.scientificName !== 'string') {
    throw new ValidationError('Plant scientific name is required', 'scientificName');
  }

  if (typeof plantData.confidence !== 'number' || plantData.confidence < 0 || plantData.confidence > 100) {
    throw new ValidationError('Invalid confidence value', 'confidence');
  }
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
