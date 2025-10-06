import {
  validateImageUri,
  validateEmail,
  validatePassword,
  sanitizeInput,
} from '@/utils/validation';
import { ValidationError } from '@/types/errors';

describe('Validation Utils', () => {
  describe('validateImageUri', () => {
    it('should accept valid file URIs', () => {
      expect(() => validateImageUri('file:///path/to/image.jpg')).not.toThrow();
    });

    it('should accept valid HTTP URIs', () => {
      expect(() => validateImageUri('https://example.com/image.jpg')).not.toThrow();
    });

    it('should reject empty strings', () => {
      expect(() => validateImageUri('')).toThrow(ValidationError);
    });

    it('should reject invalid URI formats', () => {
      expect(() => validateImageUri('invalid-uri')).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(() => validateEmail('test@example.com')).not.toThrow();
      expect(() => validateEmail('user.name+tag@domain.co.uk')).not.toThrow();
    });

    it('should reject invalid email formats', () => {
      expect(() => validateEmail('invalid-email')).toThrow(ValidationError);
      expect(() => validateEmail('missing@domain')).toThrow(ValidationError);
      expect(() => validateEmail('@domain.com')).toThrow(ValidationError);
    });

    it('should reject empty strings', () => {
      expect(() => validateEmail('')).toThrow(ValidationError);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      expect(() => validatePassword('StrongPass123')).not.toThrow();
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(() => validatePassword('Short1')).toThrow(ValidationError);
    });

    it('should reject passwords without uppercase letters', () => {
      expect(() => validatePassword('lowercase123')).toThrow(ValidationError);
    });

    it('should reject passwords without lowercase letters', () => {
      expect(() => validatePassword('UPPERCASE123')).toThrow(ValidationError);
    });

    it('should reject passwords without numbers', () => {
      expect(() => validatePassword('NoNumbers')).toThrow(ValidationError);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle quotes correctly', () => {
      expect(sanitizeInput("It's a \"test\""))
        .toBe('It&#x27;s a &quot;test&quot;');
    });

    it('should return empty string for non-string inputs', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });
});
