# PlantGenius Backend API Implementation Guide

Complete implementation guide for the MongoDB backend API required by the PlantGenius mobile app.

## Quick Start

```bash
# Create backend project
mkdir plantgenius-backend && cd plantgenius-backend
npm init -y

# Install dependencies
npm install express mongodb bcryptjs jsonwebtoken cors dotenv nodemailer
npm install -D typescript @types/express @types/node @types/bcryptjs @types/jsonwebtoken @types/cors ts-node nodemon

# Initialize TypeScript
npx tsc --init
```

## Project Structure

```
plantgenius-backend/
├── src/
│   ├── config/
│   │   └── mongodb.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Subscription.ts
│   │   ├── DailyScan.ts
│   │   ├── PlantIdentification.ts
│   │   └── SavedPlant.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── subscriptions.ts
│   │   ├── scans.ts
│   │   └── plants.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   └── payment.service.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── validation.ts
│   └── index.ts
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

## Complete Implementation

### 1. Configuration Files

#### package.json
```json
{
  "name": "plantgenius-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.ts"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "mongodb": "^6.12.0",
    "nodemailer": "^6.9.17"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.5",
    "@types/nodemailer": "^6.4.17",
    "nodemon": "^3.1.9",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.3"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

#### .env
```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_CONNECTION_STRING=mongodb+srv://programmerscourt_db_user:biaqPmArLif37ASc@cluster101.tkexfbo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster101
DB_NAME=plantgenius

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Email (SMTP2GO or any SMTP)
SMTP_HOST=mail.smtp2go.com
SMTP_PORT=2525
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@plantgenius.com

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
```

#### .gitignore
```
node_modules/
dist/
.env
.env.local
.DS_Store
```

### 2. MongoDB Configuration

#### src/config/mongodb.ts
```typescript
import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_CONNECTION_STRING!;
const DB_NAME = process.env.DB_NAME || 'plantgenius';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  // Create indexes
  await createIndexes(db);

  cachedClient = client;
  cachedDb = db;

  console.log('✅ Connected to MongoDB');
  return { client, db };
}

async function createIndexes(db: Db) {
  // Users collection indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ createdAt: -1 });

  // Subscriptions collection indexes
  await db.collection('subscriptions').createIndex({ userId: 1 });
  await db.collection('subscriptions').createIndex({ status: 1 });
  await db.collection('subscriptions').createIndex({ endDate: 1 });

  // Daily scans collection indexes
  await db.collection('daily_scans').createIndex({ userId: 1, scanDate: 1 }, { unique: true });

  // Plant identifications collection indexes
  await db.collection('plant_identifications').createIndex({ userId: 1 });
  await db.collection('plant_identifications').createIndex({ createdAt: -1 });

  // Saved plants collection indexes
  await db.collection('saved_plants').createIndex({ userId: 1 });
  await db.collection('saved_plants').createIndex({ createdAt: -1 });
}

export async function getCollection<T>(name: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase();
  return db.collection<T>(name);
}
```

### 3. Models

#### src/models/User.ts
```typescript
import { ObjectId } from 'mongodb';

export interface UserProfile {
  _id: ObjectId;
  email: string;
  password?: string; // Only for email auth
  fullName: string | null;
  avatarUrl: string | null;
  authProvider: 'email' | 'google' | 'apple';
  googleId?: string;
  appleId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### src/models/Subscription.ts
```typescript
import { ObjectId } from 'mongodb';

export interface Subscription {
  _id: ObjectId;
  userId: ObjectId;
  planType: 'basic' | 'premium';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  paymentReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Middleware

#### src/middleware/auth.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };

    req.userId = decoded.userId;
    req.email = decoded.email;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
```

#### src/middleware/errorHandler.ts
```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
}
```

### 5. Routes

#### src/routes/auth.ts
```typescript
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/mongodb';
import { UserProfile } from '../models/User';

const router = express.Router();

// Sign Up with Email
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    const users = await getCollection<UserProfile>('users');

    // Check if user exists
    const existing = await users.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await users.insertOne({
      _id: new ObjectId(),
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
      { userId: user!._id.toString(), email: user!.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({ user: { ...user, password: undefined }, token });
  } catch (error) {
    res.status(500).json({ message: 'Sign up failed', error });
  }
});

// Sign In with Email
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
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({ user: { ...user, password: undefined }, token });
  } catch (error) {
    res.status(500).json({ message: 'Sign in failed', error });
  }
});

// Password Reset Request
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    const users = await getCollection<UserProfile>('users');
    const user = await users.findOne({ email });

    if (!user) {
      return res.json({ message: 'If account exists, reset email sent' });
    }

    // TODO: Send password reset email with token
    // Implementation depends on your email service

    res.json({ message: 'If account exists, reset email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed', error });
  }
});

export default router;
```

#### src/routes/users.ts
```typescript
import express from 'express';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/mongodb';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { UserProfile } from '../models/User';

const router = express.Router();

// Get user profile
router.get('/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const users = await getCollection<UserProfile>('users');
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ ...user, password: undefined });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error });
  }
});

// Create user profile (for Google/Apple auth)
router.post('/', async (req, res) => {
  try {
    const { email, fullName, avatarUrl, authProvider, googleId, appleId } = req.body;

    const users = await getCollection<UserProfile>('users');

    // Check if user exists
    const existing = await users.findOne({ email });
    if (existing) {
      return res.json({ user: { ...existing, password: undefined } });
    }

    // Create user
    const result = await users.insertOne({
      _id: new ObjectId(),
      email,
      fullName,
      avatarUrl,
      authProvider,
      googleId,
      appleId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const user = await users.findOne({ _id: result.insertedId });
    res.json({ user: { ...user, password: undefined } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user', error });
  }
});

// Update user profile
router.patch('/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // Prevent password updates through this endpoint
    delete updates.password;

    const users = await getCollection<UserProfile>('users');

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    const user = await users.findOne({ _id: new ObjectId(userId) });
    res.json({ ...user, password: undefined });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error });
  }
});

export default router;
```

#### src/routes/scans.ts
```typescript
import express from 'express';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/mongodb';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get daily scan count
router.get('/:userId/:date', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, date } = req.params;

    const scans = await getCollection('daily_scans');
    const scan = await scans.findOne({ userId: new ObjectId(userId), scanDate: date });

    res.json(scan);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch scan', error });
  }
});

// Increment daily scan
router.post('/:userId/:date/increment', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, date } = req.params;

    const scans = await getCollection('daily_scans');

    const result = await scans.findOneAndUpdate(
      { userId: new ObjectId(userId), scanDate: date },
      {
        $inc: { scanCount: 1 },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to increment scan', error });
  }
});

export default router;
```

### 6. Main Application

#### src/index.ts
```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/mongodb';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import scanRoutes from './routes/scans';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scans', scanRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  try {
    await connectToDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

## Deployment

### Heroku
```bash
heroku create plantgenius-api
heroku config:set MONGODB_CONNECTION_STRING="your_connection_string"
heroku config:set JWT_SECRET="your_jwt_secret"
git push heroku main
```

### Vercel
```bash
npm install -g vercel
vercel
```

### Railway
```bash
npm install -g @railway/cli
railway init
railway up
```

## Testing

```bash
# Install testing dependencies
npm install -D jest @types/jest supertest @types/supertest

# Run tests
npm test
```

## API Documentation

See the mobile app's MongoDB client (`lib/mongodb.ts`) for complete API endpoint documentation and usage examples.
