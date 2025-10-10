import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Mock MongoDB Client
jest.mock('@/lib/mongodb', () => ({
  mongoClient: {
    getUserProfile: jest.fn(),
    getActiveSubscription: jest.fn(),
    getDailyScan: jest.fn(),
    updateUserProfile: jest.fn(),
    incrementDailyScan: jest.fn(),
    createSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
  },
}));

// Mock auth service
jest.mock('@/services/auth', () => ({
  authService: {
    initialize: jest.fn(),
    signUpWithEmail: jest.fn(),
    signInWithEmail: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthContext', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      aud: 'authenticated',
      created_at: '2024-01-01',
    },
    access_token: 'test-token',
    refresh_token: 'test-refresh',
  };

  const mockProfile = {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
  };

  const mockSubscription = {
    id: 'sub-1',
    plan_type: 'premium' as const,
    status: 'active' as const,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  describe('Initialization', () => {
    it('should initialize with loading state', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should load session on mount', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      // Mock profile fetch
      mockFrom.single.mockResolvedValueOnce({ data: mockProfile, error: null });
      // Mock subscription fetch
      mockFrom.single.mockResolvedValueOnce({ data: mockSubscription, error: null });
      // Mock daily scans fetch
      mockFrom.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toEqual(mockSession.user);
        expect(result.current.profile).toEqual(mockProfile);
        expect(result.current.subscription).toEqual(mockSubscription);
      });
    });
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const signUpData = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        fullName: 'New User',
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'new-user-id',
            email: signUpData.email,
          },
          session: mockSession,
        },
        error: null,
      });

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp(
          signUpData.email,
          signUpData.password,
          signUpData.fullName
        );
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
          },
        },
      });

      expect(mockInsert).toHaveBeenCalledWith({
        id: 'new-user-id',
        email: signUpData.email,
        full_name: signUpData.fullName,
      });

      expect(signUpResult.error).toBeNull();
      expect(signUpResult.data).toBeDefined();
    });

    it('should handle sign up errors', async () => {
      const signUpError = { message: 'Email already exists', status: 400 };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: signUpError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp(
          'test@example.com',
          'password',
          'Test User'
        );
      });

      expect(signUpResult.error).toEqual(signUpError);
      expect(signUpResult.data).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession,
        },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(signInResult.error).toBeNull();
      expect(signInResult.data).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      const signInError = { message: 'Invalid credentials', status: 401 };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn('wrong@example.com', 'wrongpass');
      });

      expect(signInResult.error).toEqual(signInError);
      expect(signInResult.data).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors gracefully', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      // Should not throw, just log error
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockProfile, error: null });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            update: mockUpdate,
            eq: mockEq,
            select: mockSelect,
            single: mockSingle,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBeDefined();
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateProfile({
          full_name: 'Updated Name',
        });
      });

      expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Updated Name' });
      expect(updateResult.error).toBeNull();
    });

    it('should return error when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let updateResult: any;
      await act(async () => {
        updateResult = await result.current.updateProfile({
          full_name: 'New Name',
        });
      });

      expect(updateResult.error).toBe('No user logged in');
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resetResult: any;
      await act(async () => {
        resetResult = await result.current.resetPassword('test@example.com');
      });

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
      expect(resetResult.error).toBeNull();
    });

    it('should handle reset password errors', async () => {
      const resetError = { message: 'User not found', status: 404 };

      (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: resetError,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resetResult: any;
      await act(async () => {
        resetResult = await result.current.resetPassword('nonexistent@example.com');
      });

      expect(resetResult.error).toEqual(resetError);
    });
  });

  describe('Daily Scans', () => {
    it('should increment daily scan count', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const existingScan = {
        id: 'scan-1',
        user_id: 'test-user-id',
        scan_date: new Date().toISOString().split('T')[0],
        scan_count: 2,
      };

      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'daily_scans') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: existingScan, error: null }),
            update: mockUpdate,
            insert: jest.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.incrementDailyScan();
      });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should calculate remaining scans correctly', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Default should be 5 scans
      expect(result.current.dailyScansRemaining).toBe(5);
    });
  });

  describe('Subscription Status', () => {
    it('should return true for active subscription', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      mockFrom.single.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockFrom.single.mockResolvedValueOnce({ data: mockSubscription, error: null });
      mockFrom.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.subscription).toEqual(mockSubscription);
      });

      const hasActive = result.current.hasActiveSubscription();
      expect(hasActive).toBe(true);
    });

    it('should allow scanning with active subscription', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFrom);

      mockFrom.single.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockFrom.single.mockResolvedValueOnce({ data: mockSubscription, error: null });
      mockFrom.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const canScan = result.current.canScan();
      expect(canScan).toBe(true);
    });

    it('should allow scanning with remaining daily scans', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // No subscription but has daily scans
      const canScan = result.current.canScan();
      expect(canScan).toBe(true);
      expect(result.current.dailyScansRemaining).toBeGreaterThan(0);
    });
  });
});
