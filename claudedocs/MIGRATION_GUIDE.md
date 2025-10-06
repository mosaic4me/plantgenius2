# PlantGenius Migration Guide

## Overview

This document outlines the complete migration from Supabase and Plant.id to MongoDB and Pl@ntNet, including implementation of Google and Apple Sign In.

## Migration Summary

| Component | From | To |
|-----------|------|-----|
| Database | Supabase (PostgreSQL) | MongoDB Atlas |
| Authentication | Supabase Auth (Email only) | Google + Apple + Email/Password |
| Plant API | Plant.id | Pl@ntNet |
| Backend | Supabase Edge Functions | Node.js/Express API |

## Architecture Changes

### Before
```
React Native App
    ↓
Supabase Client
    ↓
Supabase (Auth + Database + Storage)
    ↓
Plant.id API
```

### After
```
React Native App
    ↓
Auth Service (Google/Apple/Email)
    ↓
MongoDB API (Node.js/Express)
    ↓
MongoDB Atlas

React Native App
    ↓
Pl@ntNet API (Direct)
```

## Step-by-Step Migration

### Phase 1: Backend API Setup

#### 1.1 Create Node.js Backend Project

```bash
mkdir plantgenius-backend
cd plantgenius-backend
npm init -y
npm install express mongodb bcryptjs jsonwebtoken cors dotenv
npm install -D @types/express @types/node typescript ts-node
```

#### 1.2 Backend Structure

```
plantgenius-backend/
├── src/
│   ├── config/
│   │   └── mongodb.ts          # MongoDB connection
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   └── errorHandler.ts     # Error handling
│   ├── models/
│   │   ├── User.ts              # User model
│   │   ├── Subscription.ts     # Subscription model
│   │   └── DailyScan.ts        # DailyScan model
│   ├── routes/
│   │   ├── auth.ts              # Authentication routes
│   │   ├── users.ts             # User routes
│   │   ├── subscriptions.ts    # Subscription routes
│   │   ├── scans.ts             # Daily scan routes
│   │   └── plants.ts            # Plant data routes
│   ├── services/
│   │   ├── auth.service.ts      # Auth logic
│   │   └── email.service.ts     # Email notifications
│   └── index.ts                 # App entry point
├── .env
├── package.json
└── tsconfig.json
```

#### 1.3 MongoDB Connection (src/config/mongodb.ts)

```typescript
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING!;
const DB_NAME = 'plantgenius';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export async function getCollection<T>(name: string) {
  const { db } = await connectToDatabase();
  return db.collection<T>(name);
}
```

#### 1.4 Authentication Routes (src/routes/auth.ts)

```typescript
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getCollection } from '../config/mongodb';
import { UserProfile } from '../models/User';

const router = express.Router();

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    const users = await getCollection<UserProfile>('users');

    // Check if user already exists
    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await users.insertOne({
      email,
      password: hashedPassword,
      fullName,
      avatarUrl: null,
      authProvider: 'email',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const user = await users.findOne({ _id: result.insertedId });

    // Generate JWT
    const token = jwt.sign(
      { userId: user!._id, email: user!.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: 'Sign up failed', error });
  }
});

// Sign In
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const users = await getCollection<UserProfile>('users');
    const user = await users.findOne({ email });

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: 'Sign in failed', error });
  }
});

// Password Reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    const users = await getCollection<UserProfile>('users');
    const user = await users.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If account exists, reset email sent' });
    }

    // TODO: Send password reset email
    // Use your email service (SMTP2GO, SendGrid, etc.)

    res.json({ message: 'If account exists, reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed', error });
  }
});

export default router;
```

#### 1.5 User Routes (src/routes/users.ts)

```typescript
import express from 'express';
import { getCollection } from '../config/mongodb';
import { authMiddleware } from '../middleware/auth';
import { UserProfile } from '../models/User';

const router = express.Router();

// Get user profile
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await getCollection<UserProfile>('users');
    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error });
  }
});

// Update user profile
router.patch('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const users = await getCollection<UserProfile>('users');

    await users.updateOne(
      { _id: userId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    const user = await users.findOne({ _id: userId });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error });
  }
});

export default router;
```

### Phase 2: Frontend Migration

#### 2.1 Update Dependencies

```bash
# Remove Supabase
bun remove @supabase/supabase-js

# Add new dependencies
bun add expo-auth-session expo-apple-authentication expo-crypto dotenv
bun add @sentry/react-native
```

#### 2.2 Update Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Pl@ntNet API
PLANTNET_API_KEY=2b10ljY2KkrPghrnquDKbQ8V2

# MongoDB Backend API
MONGODB_API_URL=https://your-backend-api.com/api

# Google Sign In
GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
GOOGLE_IOS_CLIENT_ID=your_ios_client_id
GOOGLE_WEB_CLIENT_ID=your_web_client_id

# Apple Sign In
APPLE_SIGN_IN_ENABLED=true
```

#### 2.3 Configure Google Sign In

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Android Client ID (with SHA-1 fingerprint)
   - iOS Client ID (with Bundle ID)
   - Web Client ID

#### 2.4 Configure Apple Sign In

1. Go to [Apple Developer](https://developer.apple.com/)
2. Add "Sign In with Apple" capability to your app identifier
3. Update `app.json`:

```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true,
      "bundleIdentifier": "com.plantsgenius.app"
    }
  }
}
```

### Phase 3: Data Migration

#### 3.1 Export from Supabase

```sql
-- Export users
COPY (SELECT * FROM profiles) TO '/tmp/profiles.csv' CSV HEADER;

-- Export subscriptions
COPY (SELECT * FROM subscriptions) TO '/tmp/subscriptions.csv' CSV HEADER;

-- Export daily scans
COPY (SELECT * FROM daily_scans) TO '/tmp/daily_scans.csv' CSV HEADER;
```

#### 3.2 Import to MongoDB

```javascript
const { MongoClient } = require('mongodb');
const csv = require('csv-parser');
const fs = require('fs');

async function importData() {
  const client = await MongoClient.connect(process.env.MONGODB_CONNECTION_STRING);
  const db = client.db('plantgenius');

  // Import users
  const users = [];
  fs.createReadStream('/tmp/profiles.csv')
    .pipe(csv())
    .on('data', (row) => users.push(row))
    .on('end', async () => {
      await db.collection('users').insertMany(users);
      console.log('Users imported');
    });

  // Repeat for subscriptions and daily_scans
}

importData();
```

### Phase 4: Testing

#### 4.1 Test Authentication Flows

```bash
# Test Email Sign Up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'

# Test Email Sign In
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

#### 4.2 Test Pl@ntNet API

```bash
# Test plant identification
curl -X POST "https://my-api.plantnet.org/v2/identify/all?api-key=2b10ljY2KkrPghrnquDKbQ8V2" \
  -F "images=@plant.jpg" \
  -F "organs=auto"
```

### Phase 5: Deployment

#### 5.1 Deploy Backend API

Options:
- **Heroku**: `heroku create plantgenius-api && git push heroku main`
- **Vercel**: Serverless functions in `/api` directory
- **AWS Lambda**: Use Serverless Framework
- **Railway**: Simple deployment with MongoDB integration

#### 5.2 Update Frontend Configuration

```env
MONGODB_API_URL=https://plantgenius-api.herokuapp.com/api
```

#### 5.3 Deploy Mobile App

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Rollback Plan

If migration fails:

1. **Keep Supabase Running**: Don't delete Supabase project until migration is verified
2. **Gradual Rollout**: Use feature flags to enable new auth for subset of users
3. **Data Sync**: Keep both databases in sync during transition period
4. **Quick Revert**: Keep old code in `*.old.ts` files for quick rollback

## Monitoring

- **Sentry**: Monitor errors in production
- **MongoDB Atlas**: Monitor database performance
- **Google Analytics**: Track auth method adoption
- **Pl@ntNet Dashboard**: Monitor API usage and rate limits

## Cost Comparison

| Service | Before (Monthly) | After (Monthly) |
|---------|------------------|-----------------|
| Database | Supabase Free/Pro | MongoDB Atlas Free/$9 |
| Authentication | Included | Free (Google/Apple) |
| Plant API | Plant.id $29 | Pl@ntNet Free/€5 |
| Backend Hosting | Included | Heroku/Vercel $0-$25 |
| **Total** | $29-$79 | $0-$39 |

## Support

- **MongoDB Issues**: https://www.mongodb.com/community/forums
- **Pl@ntNet API**: https://my.plantnet.org/doc
- **Google Sign In**: https://developers.google.com/identity
- **Apple Sign In**: https://developer.apple.com/sign-in-with-apple

## Next Steps

1. ✅ Backend API implementation
2. ✅ Frontend migration
3. ⏳ Data migration
4. ⏳ Testing
5. ⏳ Deployment
6. ⏳ User migration
7. ⏳ Supabase decommissioning
