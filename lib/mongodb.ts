/**
 * MongoDB Connection and Database Layer
 *
 * Provides MongoDB client initialization and database operations
 * for PlantGenius application with proper error handling and type safety.
 */

import { logger } from '@/utils/logger';

// MongoDB connection string from config
const MONGODB_URI = 'mongodb+srv://programmerscourt_db_user:biaqPmArLif37ASc@cluster101.tkexfbo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster101';
const DB_NAME = 'plantgenius';

/**
 * User Profile Document
 */
export interface UserProfile {
  _id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  authProvider: 'email' | 'google' | 'apple';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription Document
 */
export interface Subscription {
  _id: string;
  userId: string;
  planType: 'basic' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  paymentReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Daily Scan Document
 */
export interface DailyScan {
  _id: string;
  userId: string;
  scanDate: string; // YYYY-MM-DD format
  scanCount: number;
  createdAt: Date;
}

/**
 * Plant Identification Document (for cloud backup)
 */
export interface PlantIdentificationDoc {
  _id: string;
  userId: string;
  plantData: any; // Full PlantIdentification object
  createdAt: Date;
}

/**
 * Saved Plant Document (for cloud garden sync)
 */
export interface SavedPlantDoc {
  _id: string;
  userId: string;
  plantId: string;
  plantData: any;
  addedToGarden: Date;
  healthStatus: 'healthy' | 'needs-attention' | 'sick';
  lastWatered?: Date;
  nextWateringDue?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB API Client
 *
 * Provides methods for interacting with MongoDB through a REST API
 * or serverless functions (since React Native can't use MongoDB driver directly)
 */
class MongoDBClient {
  private apiUrl: string;

  constructor() {
    // In production, this would be your backend API URL
    // For now, we'll use a placeholder that should be configured
    this.apiUrl = process.env.MONGODB_API_URL || 'http://localhost:3000/api';
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error('MongoDB API error', err, { endpoint });
      throw err;
    }
  }

  /**
   * User Profile Operations
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await this.fetchAPI<UserProfile>(`/users/${userId}`);
    } catch (error) {
      logger.error('Error fetching user profile', error as Error, { userId });
      return null;
    }
  }

  async createUserProfile(profile: Omit<UserProfile, '_id' | 'createdAt' | 'updatedAt'>): Promise<UserProfile> {
    return await this.fetchAPI<UserProfile>('/users', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return await this.fetchAPI<UserProfile>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Subscription Operations
   */
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    try {
      const response = await this.fetchAPI<{ subscription: Subscription | null }>(
        `/subscriptions/active/${userId}`
      );
      return response.subscription;
    } catch (error) {
      logger.error('Error fetching subscription', error as Error, { userId });
      return null;
    }
  }

  async createSubscription(subscription: Omit<Subscription, '_id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    return await this.fetchAPI<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  }

  async updateSubscription(subscriptionId: string, updates: Partial<Subscription>): Promise<Subscription> {
    return await this.fetchAPI<Subscription>(`/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Daily Scan Operations
   */
  async getDailyScan(userId: string, date: string): Promise<DailyScan | null> {
    try {
      return await this.fetchAPI<DailyScan>(`/scans/${userId}/${date}`);
    } catch (error) {
      logger.error('Error fetching daily scan', error as Error, { userId, date });
      return null;
    }
  }

  async incrementDailyScan(userId: string, date: string): Promise<DailyScan> {
    return await this.fetchAPI<DailyScan>(`/scans/${userId}/${date}/increment`, {
      method: 'POST',
    });
  }

  /**
   * Plant Identification Operations (Cloud Backup)
   */
  async savePlantIdentification(userId: string, plantData: any): Promise<PlantIdentificationDoc> {
    return await this.fetchAPI<PlantIdentificationDoc>('/plants/identifications', {
      method: 'POST',
      body: JSON.stringify({ userId, plantData }),
    });
  }

  async getPlantIdentifications(userId: string, limit: number = 50): Promise<PlantIdentificationDoc[]> {
    return await this.fetchAPI<PlantIdentificationDoc[]>(
      `/plants/identifications/${userId}?limit=${limit}`
    );
  }

  /**
   * Saved Plant Operations (Cloud Garden Sync)
   */
  async getSavedPlants(userId: string): Promise<SavedPlantDoc[]> {
    return await this.fetchAPI<SavedPlantDoc[]>(`/plants/saved/${userId}`);
  }

  async savePlant(plant: Omit<SavedPlantDoc, '_id' | 'createdAt' | 'updatedAt'>): Promise<SavedPlantDoc> {
    return await this.fetchAPI<SavedPlantDoc>('/plants/saved', {
      method: 'POST',
      body: JSON.stringify(plant),
    });
  }

  async updateSavedPlant(plantId: string, updates: Partial<SavedPlantDoc>): Promise<SavedPlantDoc> {
    return await this.fetchAPI<SavedPlantDoc>(`/plants/saved/${plantId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteSavedPlant(plantId: string): Promise<void> {
    await this.fetchAPI<void>(`/plants/saved/${plantId}`, {
      method: 'DELETE',
    });
  }
}

export const mongoClient = new MongoDBClient();

/**
 * MongoDB Backend API Implementation Notes:
 *
 * Since React Native cannot directly connect to MongoDB, you need to implement
 * a backend API (Node.js/Express, Next.js API routes, or serverless functions)
 *
 * Example structure:
 *
 * backend/
 *   ├── api/
 *   │   ├── users/
 *   │   │   ├── [userId].ts         // GET, PATCH user profile
 *   │   │   └── index.ts             // POST create user
 *   │   ├── subscriptions/
 *   │   │   ├── active/[userId].ts  // GET active subscription
 *   │   │   ├── [id].ts              // PATCH subscription
 *   │   │   └── index.ts             // POST create subscription
 *   │   ├── scans/
 *   │   │   └── [userId]/[date]/
 *   │   │       ├── index.ts         // GET daily scan
 *   │   │       └── increment.ts     // POST increment scan
 *   │   └── plants/
 *   │       ├── identifications/
 *   │       │   ├── [userId].ts      // GET user's identifications
 *   │       │   └── index.ts         // POST save identification
 *   │       └── saved/
 *   │           ├── [userId].ts      // GET user's saved plants
 *   │           ├── [plantId].ts     // PATCH, DELETE plant
 *   │           └── index.ts         // POST save plant
 *   └── mongodb.ts                    // MongoDB connection utility
 *
 * Use MongoDB Node.js driver in your backend:
 * ```typescript
 * import { MongoClient } from 'mongodb';
 *
 * const client = new MongoClient(MONGODB_URI);
 * await client.connect();
 * const db = client.db(DB_NAME);
 *
 * // Collections
 * const users = db.collection<UserProfile>('users');
 * const subscriptions = db.collection<Subscription>('subscriptions');
 * const dailyScans = db.collection<DailyScan>('daily_scans');
 * const plantIdentifications = db.collection<PlantIdentificationDoc>('plant_identifications');
 * const savedPlants = db.collection<SavedPlantDoc>('saved_plants');
 * ```
 */
