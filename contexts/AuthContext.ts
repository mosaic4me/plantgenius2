/**
 * Authentication Context
 *
 * Provides authentication state and methods using Google, Apple, and Email/Password
 * with MongoDB backend integration.
 */

import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService, AuthUser, AuthSession, AuthError } from '@/services/auth';
import { mongoClient } from '@/lib/mongodb';
import { logger } from '@/utils/logger';
import { setSentryUser } from '@/utils/sentry';

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  authProvider: 'email' | 'google' | 'apple';
}

interface Subscription {
  id: string;
  planType: 'basic' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyScansRemaining, setDailyScansRemaining] = useState(5);

  /**
   * Load user profile from MongoDB
   */
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const data = await mongoClient.getUserProfile(userId);
      if (data) {
        setProfile({
          id: data._id,
          email: data.email,
          fullName: data.fullName,
          avatarUrl: data.avatarUrl,
          authProvider: data.authProvider,
        });

        // Set Sentry user for error tracking
        setSentryUser({ id: data._id, email: data.email });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error loading profile', err, { userId });
    }
  }, []);

  /**
   * Load user subscription from MongoDB
   */
  const loadSubscription = useCallback(async (userId: string) => {
    try {
      const data = await mongoClient.getActiveSubscription(userId);
      if (data) {
        setSubscription({
          id: data._id,
          planType: data.planType,
          status: data.status,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate.toISOString(),
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error loading subscription', err, { userId });
    }
  }, []);

  /**
   * Load daily scans count from MongoDB
   */
  const loadDailyScans = useCallback(async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await mongoClient.getDailyScan(userId, today);

      const scanCount = data?.scanCount || 0;
      setDailyScansRemaining(Math.max(0, 5 - scanCount));
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error loading daily scans', err, { userId });
    }
  }, []);

  /**
   * Initialize authentication on mount
   */
  useEffect(() => {
    authService.initialize().then((sessionData) => {
      setSession(sessionData);
      setUser(sessionData?.user ?? null);

      if (sessionData?.user) {
        loadProfile(sessionData.user.id);
        loadSubscription(sessionData.user.id);
        loadDailyScans(sessionData.user.id);
      }

      setLoading(false);
    });
  }, [loadProfile, loadSubscription, loadDailyScans]);

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        const { session: newSession, error } = await authService.signUpWithEmail(
          email,
          password,
          fullName
        );

        if (error) {
          return { data: null, error };
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await loadProfile(newSession.user.id);
          await loadSubscription(newSession.user.id);
          await loadDailyScans(newSession.user.id);
        }

        return { data: newSession, error: null };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('Error signing up', err, { email });
        return { data: null, error: { message: err.message, code: 'SIGN_UP_FAILED' } };
      }
    },
    [loadProfile, loadSubscription, loadDailyScans]
  );

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { session: newSession, error } = await authService.signInWithEmail(email, password);

        if (error) {
          return { data: null, error };
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await loadProfile(newSession.user.id);
          await loadSubscription(newSession.user.id);
          await loadDailyScans(newSession.user.id);
        }

        return { data: newSession, error: null };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('Error signing in', err, { email });
        return { data: null, error: { message: err.message, code: 'SIGN_IN_FAILED' } };
      }
    },
    [loadProfile, loadSubscription, loadDailyScans]
  );

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      const { session: newSession, error } = await authService.signInWithGoogle();

      if (error) {
        return { data: null, error };
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
        await loadSubscription(newSession.user.id);
        await loadDailyScans(newSession.user.id);
      }

      return { data: newSession, error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error signing in with Google', err);
      return { data: null, error: { message: err.message, code: 'GOOGLE_SIGN_IN_FAILED' } };
    }
  }, [loadProfile, loadSubscription, loadDailyScans]);

  /**
   * Sign in with Apple (iOS only)
   */
  const signInWithApple = useCallback(async () => {
    try {
      const { session: newSession, error } = await authService.signInWithApple();

      if (error) {
        return { data: null, error };
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
        await loadSubscription(newSession.user.id);
        await loadDailyScans(newSession.user.id);
      }

      return { data: newSession, error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error signing in with Apple', err);
      return { data: null, error: { message: err.message, code: 'APPLE_SIGN_IN_FAILED' } };
    }
  }, [loadProfile, loadSubscription, loadDailyScans]);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setSubscription(null);
      setDailyScansRemaining(5);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error signing out', err);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user) return { error: 'No user logged in' };

      try {
        await mongoClient.updateUserProfile(user.id, {
          fullName: updates.fullName,
          avatarUrl: updates.avatarUrl,
          updatedAt: new Date(),
        });

        await loadProfile(user.id);
        return { error: null };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        logger.error('Error updating profile', err, { userId: user?.id });
        return { error: err.message };
      }
    },
    [user, loadProfile]
  );

  /**
   * Reset password
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await authService.resetPassword(email);
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error resetting password', err, { email });
      return { error: { message: err.message, code: 'PASSWORD_RESET_FAILED' } };
    }
  }, []);

  /**
   * Increment daily scan count
   */
  const incrementDailyScan = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await mongoClient.incrementDailyScan(user.id, today);
      await loadDailyScans(user.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Error incrementing daily scan', err, { userId: user?.id });
    }
  }, [user, loadDailyScans]);

  /**
   * Check if user has active subscription
   */
  const hasActiveSubscription = useCallback(() => {
    return subscription?.status === 'active';
  }, [subscription]);

  /**
   * Check if user can perform a scan
   */
  const canScan = useCallback(() => {
    return hasActiveSubscription() || dailyScansRemaining > 0;
  }, [hasActiveSubscription, dailyScansRemaining]);

  return useMemo(
    () => ({
      session,
      user,
      profile,
      subscription,
      loading,
      dailyScansRemaining,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      updateProfile,
      resetPassword,
      incrementDailyScan,
      hasActiveSubscription,
      canScan,
    }),
    [
      session,
      user,
      profile,
      subscription,
      loading,
      dailyScansRemaining,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      updateProfile,
      resetPassword,
      incrementDailyScan,
      hasActiveSubscription,
      canScan,
    ]
  );
});
