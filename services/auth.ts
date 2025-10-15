/**
 * Authentication Service
 *
 * Handles Google Sign In, Apple Sign In, and Email/Password authentication
 * with MongoDB backend integration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';
import { mongoClient, UserProfile } from '@/lib/mongodb';
import { config } from '@/utils/config';

// Warm up web browser for auth
WebBrowser.maybeCompleteAuthSession();

const AUTH_TOKEN_KEY = '@plantgenius_auth_token';
const AUTH_USER_KEY = '@plantgenius_auth_user';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  authProvider: 'email' | 'google' | 'apple';
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

export interface AuthError {
  message: string;
  code: string;
}

/**
 * Authentication Service Class
 */
class AuthService {
  private session: AuthSession | null = null;

  /**
   * Initialize auth service and restore session if exists
   */
  async initialize(): Promise<AuthSession | null> {
    try {
      const [tokenStr, userStr] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY),
      ]);

      if (tokenStr && userStr) {
        const sessionData = JSON.parse(tokenStr);
        const userData = JSON.parse(userStr);

        // Check if token is still valid
        if (sessionData.expiresAt > Date.now()) {
          this.session = {
            token: sessionData.token,
            user: userData,
            expiresAt: sessionData.expiresAt,
          };
          return this.session;
        }
      }

      // Clear invalid session
      await this.clearSession();
      return null;
    } catch (error) {
      logger.error('Error initializing auth', error as Error);
      return null;
    }
  }

  /**
   * Get current session
   */
  getSession(): AuthSession | null {
    return this.session;
  }

  /**
   * Google Sign In
   * Fixed: Removed React Hook usage, using imperative AuthSession API
   */
  async signInWithGoogle(): Promise<{ session: AuthSession | null; error: AuthError | null }> {
    try {
      // Get Google OAuth client ID based on platform
      const clientId = Platform.select({
        ios: config.googleIosClientId,
        android: config.googleAndroidClientId,
        default: config.googleWebClientId,
      });

      if (!clientId) {
        throw new Error('Google OAuth client ID not configured for this platform');
      }

      // Create redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'myapp',
        path: 'redirect'
      });

      // Build Google OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent('profile email')}`;

      // Start authentication flow
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: redirectUri
      });

      if (result.type === 'success' && result.params.access_token) {
        // Get user info from Google
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/userinfo/v2/me',
          {
            headers: { Authorization: `Bearer ${result.params.access_token}` },
          }
        );

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info from Google');
        }

        const userInfo = await userInfoResponse.json();

        // Create or update user in MongoDB
        const user = await this.createOrUpdateGoogleUser(userInfo);

        // Create session
        const session = await this.createSession(user, 'google');
        await this.saveSession(session);

        return { session, error: null };
      }

      return { session: null, error: { message: 'Sign in cancelled', code: 'CANCELLED' } };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Google sign in error', err);
      return {
        session: null,
        error: { message: err.message, code: 'GOOGLE_SIGN_IN_FAILED' },
      };
    }
  }

  /**
   * Apple Sign In (iOS only)
   */
  async signInWithApple(): Promise<{ session: AuthSession | null; error: AuthError | null }> {
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign In is only available on iOS');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.user) {
        throw new Error('No user ID received from Apple');
      }

      // Create or update user in MongoDB
      const user = await this.createOrUpdateAppleUser(credential);

      // Create session
      const session = await this.createSession(user, 'apple');
      await this.saveSession(session);

      return { session, error: null };
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        return { session: null, error: { message: 'Sign in cancelled', code: 'CANCELLED' } };
      }

      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Apple sign in error', err);
      return {
        session: null,
        error: { message: err.message, code: 'APPLE_SIGN_IN_FAILED' },
      };
    }
  }

  /**
   * Email/Password Sign Up
   */
  async signUpWithEmail(
    email: string,
    password: string,
    fullName: string
  ): Promise<{ session: AuthSession | null; error: AuthError | null }> {
    try {
      // Call backend API to create user
      const response = await fetch(`${process.env.MONGODB_API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign up failed');
      }

      const { user, token } = await response.json();

      // Create session
      const session: AuthSession = {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          authProvider: 'email',
        },
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      await this.saveSession(session);
      return { session, error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Email sign up error', err);
      return {
        session: null,
        error: { message: err.message, code: 'EMAIL_SIGN_UP_FAILED' },
      };
    }
  }

  /**
   * Email/Password Sign In
   */
  async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ session: AuthSession | null; error: AuthError | null }> {
    try {
      // Call backend API to authenticate
      const response = await fetch(`${process.env.MONGODB_API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign in failed');
      }

      const { user, token } = await response.json();

      // Create session
      const session: AuthSession = {
        token,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          authProvider: 'email',
        },
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      await this.saveSession(session);
      return { session, error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Email sign in error', err);
      return {
        session: null,
        error: { message: err.message, code: 'EMAIL_SIGN_IN_FAILED' },
      };
    }
  }

  /**
   * Password Reset
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const response = await fetch(`${process.env.MONGODB_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }

      return { error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Password reset error', err);
      return { error: { message: err.message, code: 'PASSWORD_RESET_FAILED' } };
    }
  }

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    await this.clearSession();
  }

  /**
   * Helper: Create or update Google user
   * PRODUCTION FIX: Added error handling for backend API failures
   */
  private async createOrUpdateGoogleUser(googleUser: any): Promise<AuthUser> {
    try {
      const profile = await mongoClient.getUserProfile(googleUser.id);

      if (profile) {
        // Update existing profile
        const updated = await mongoClient.updateUserProfile(googleUser.id, {
          email: googleUser.email,
          fullName: googleUser.name,
          avatarUrl: googleUser.picture,
          updatedAt: new Date(),
        });

        return {
          id: updated._id,
          email: updated.email,
          fullName: updated.fullName,
          avatarUrl: updated.avatarUrl,
          authProvider: 'google',
        };
      }

      // Create new profile
      const created = await mongoClient.createUserProfile({
        email: googleUser.email,
        fullName: googleUser.name,
        avatarUrl: googleUser.picture,
        authProvider: 'google',
      });

      return {
        id: created._id,
        email: created.email,
        fullName: created.fullName,
        avatarUrl: created.avatarUrl,
        authProvider: 'google',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Failed to create/update Google user', err, { email: googleUser.email });
      throw new Error('Google Sign In failed. Please try email login or contact support.');
    }
  }

  /**
   * Helper: Create or update Apple user
   * PRODUCTION FIX: Added error handling for backend API failures
   */
  private async createOrUpdateAppleUser(credential: AppleAuthentication.AppleAuthenticationCredential): Promise<AuthUser> {
    try {
      const profile = await mongoClient.getUserProfile(credential.user);

      if (profile) {
        // Update existing profile
        const updated = await mongoClient.updateUserProfile(credential.user, {
          updatedAt: new Date(),
        });

        return {
          id: updated._id,
          email: updated.email,
          fullName: updated.fullName,
          avatarUrl: updated.avatarUrl,
          authProvider: 'apple',
        };
      }

      // Create new profile
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : null;

      const created = await mongoClient.createUserProfile({
        email: credential.email || `${credential.user}@privaterelay.appleid.com`,
        fullName,
        avatarUrl: null,
        authProvider: 'apple',
      });

      return {
        id: created._id,
        email: created.email,
        fullName: created.fullName,
        avatarUrl: created.avatarUrl,
        authProvider: 'apple',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Failed to create/update Apple user', err, { userId: credential.user });
      throw new Error('Apple Sign In failed. Please try email login or contact support.');
    }
  }

  /**
   * Helper: Create session with token
   */
  private async createSession(user: AuthUser, provider: 'email' | 'google' | 'apple'): Promise<AuthSession> {
    // Generate JWT token (in production, this should be done by backend)
    const token = await this.generateToken(user);

    return {
      token,
      user,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  }

  /**
   * Helper: Generate JWT token (placeholder - should be backend)
   * Fixed: Replaced Node.js Buffer with React Native compatible btoa()
   */
  private async generateToken(user: AuthUser): Promise<string> {
    // In production, the backend should generate and sign the JWT
    // This is a placeholder for client-side session management
    const payload = {
      userId: user.id,
      email: user.email,
      provider: user.authProvider,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    // Use btoa() which is available in React Native
    return btoa(JSON.stringify(payload));
  }

  /**
   * Helper: Save session to AsyncStorage
   */
  private async saveSession(session: AuthSession): Promise<void> {
    this.session = session;

    await Promise.all([
      AsyncStorage.setItem(
        AUTH_TOKEN_KEY,
        JSON.stringify({ token: session.token, expiresAt: session.expiresAt })
      ),
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user)),
    ]);
  }

  /**
   * Helper: Clear session from memory and storage
   */
  private async clearSession(): Promise<void> {
    this.session = null;
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_USER_KEY),
    ]);
  }
}

export const authService = new AuthService();
