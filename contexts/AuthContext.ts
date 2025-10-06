import createContextHook from '@nkzw/create-context-hook';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { AuthenticationError } from '@/types/errors';

interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface Subscription {
    id: string;
    plan_type: 'basic' | 'premium';
    status: 'active' | 'cancelled' | 'expired';
    start_date: string;
    end_date: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [dailyScansRemaining, setDailyScansRemaining] = useState(5);

    const loadProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error loading profile', err, { userId });
        }
    }, []);

    const loadSubscription = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            setSubscription(data);
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error loading subscription', err, { userId });
        }
    }, []);

    const loadDailyScans = useCallback(async (userId: string) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('daily_scans')
                .select('*')
                .eq('user_id', userId)
                .eq('scan_date', today)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            const scanCount = data?.scan_count || 0;
            setDailyScansRemaining(Math.max(0, 5 - scanCount));
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error loading daily scans', err, { userId });
        }
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
                loadSubscription(session.user.id);
                loadDailyScans(session.user.id);
            }
            setLoading(false);
        });

        const {
            data: { subscription: authListener },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
                loadSubscription(session.user.id);
                loadDailyScans(session.user.id);
            } else {
                setProfile(null);
                setSubscription(null);
                setDailyScansRemaining(5);
            }
        });

        return () => {
            authListener.unsubscribe();
        };
    }, [loadProfile, loadSubscription, loadDailyScans]);

    const signUp = useCallback(async (email: string, password: string, fullName: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) throw error;

            if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    email: data.user.email!,
                    full_name: fullName,
                });
            }

            return { data, error: null };
        } catch (error) {
            const authError = error as AuthError;
            logger.error('Error signing up', authError, { email });
            return { data: null, error: authError };
        }
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            const authError = error as AuthError;
            logger.error('Error signing in', authError, { email });
            return { data: null, error: authError };
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error signing out', err);
        }
    }, []);

    const updateProfile = useCallback(async (updates: Partial<Profile>) => {
        if (!user) return { error: 'No user logged in' };

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
            await loadProfile(user.id);
            return { error: null };
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error updating profile', err, { userId: user?.id });
            return { error: err };
        }
    }, [user, loadProfile]);

    const resetPassword = useCallback(async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return { error: null };
        } catch (error) {
            const authError = error as AuthError;
            logger.error('Error resetting password', authError, { email });
            return { error: authError };
        }
    }, []);

    const incrementDailyScan = useCallback(async () => {
        if (!user) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: existing } = await supabase
                .from('daily_scans')
                .select('*')
                .eq('user_id', user.id)
                .eq('scan_date', today)
                .single();

            if (existing) {
                await supabase
                    .from('daily_scans')
                    .update({ scan_count: existing.scan_count + 1 })
                    .eq('id', existing.id);
            } else {
                await supabase.from('daily_scans').insert({
                    user_id: user.id,
                    scan_date: today,
                    scan_count: 1,
                });
            }

            await loadDailyScans(user.id);
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            logger.error('Error incrementing daily scan', err, { userId: user?.id });
        }
    }, [user, loadDailyScans]);

    const hasActiveSubscription = useCallback(() => {
        return subscription?.status === 'active';
    }, [subscription]);

    const canScan = useCallback(() => {
        return hasActiveSubscription() || dailyScansRemaining > 0;
    }, [hasActiveSubscription, dailyScansRemaining]);

    return useMemo(() => ({
        session,
        user,
        profile,
        subscription,
        loading,
        dailyScansRemaining,
        signUp,
        signIn,
        signOut,
        updateProfile,
        resetPassword,
        incrementDailyScan,
        hasActiveSubscription,
        canScan,
    }), [
        session,
        user,
        profile,
        subscription,
        loading,
        dailyScansRemaining,
        signUp,
        signIn,
        signOut,
        updateProfile,
        resetPassword,
        incrementDailyScan,
        hasActiveSubscription,
        canScan,
    ]);
});
