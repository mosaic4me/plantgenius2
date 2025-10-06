import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/utils/config';

const supabaseUrl = config.supabaseUrl;
const supabaseAnonKey = config.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            subscriptions: {
                Row: {
                    id: string;
                    user_id: string;
                    plan_type: 'basic' | 'premium';
                    status: 'active' | 'cancelled' | 'expired';
                    start_date: string;
                    end_date: string;
                    payment_reference: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    plan_type: 'basic' | 'premium';
                    status?: 'active' | 'cancelled' | 'expired';
                    start_date: string;
                    end_date: string;
                    payment_reference?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    plan_type?: 'basic' | 'premium';
                    status?: 'active' | 'cancelled' | 'expired';
                    start_date?: string;
                    end_date?: string;
                    payment_reference?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            daily_scans: {
                Row: {
                    id: string;
                    user_id: string;
                    scan_date: string;
                    scan_count: number;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    scan_date: string;
                    scan_count?: number;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    scan_date?: string;
                    scan_count?: number;
                    created_at?: string;
                };
            };
        };
    };
}
