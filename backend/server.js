/**
 * PlantGenius Backend API
 * Express + MongoDB REST API for React Native mobile app
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

async function connectToMongoDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME || 'plantgenius');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      fullName: fullName || null,
      avatarUrl: null,
      authProvider: 'email',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const user = await db.collection('users').findOne({ _id: result.insertedId });
    delete user.password;

    res.json({ user, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    delete user.password;
    res.json({ user, token });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// User Routes
app.get('/api/users/:userId', authMiddleware, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.params.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.patch('/api/users/:userId', authMiddleware, async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body;

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.params.userId) },
      {
        $set: {
          fullName,
          avatarUrl,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    res.json(result.value);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Subscription Routes
app.get('/api/subscriptions/active/:userId', authMiddleware, async (req, res) => {
  try {
    const subscription = await db.collection('subscriptions').findOne({
      userId: req.params.userId,
      status: 'active',
      endDate: { $gt: new Date() }
    });

    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

app.post('/api/subscriptions', authMiddleware, async (req, res) => {
  try {
    const subscription = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('subscriptions').insertOne(subscription);
    subscription._id = result.insertedId;

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Daily Scans Routes
app.get('/api/scans/:userId/:date', authMiddleware, async (req, res) => {
  try {
    const scan = await db.collection('daily_scans').findOne({
      userId: req.params.userId,
      scanDate: req.params.date
    });

    res.json(scan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scan' });
  }
});

app.post('/api/scans/:userId/:date/increment', authMiddleware, async (req, res) => {
  try {
    const result = await db.collection('daily_scans').findOneAndUpdate(
      { userId: req.params.userId, scanDate: req.params.date },
      {
        $inc: { scanCount: 1 },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json(result.value);
  } catch (error) {
    res.status(500).json({ error: 'Failed to increment scan' });
  }
});

// Payment Verification Route
app.post('/api/payments/verify', authMiddleware, async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Payment reference required' });
    }

    // Verify with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const paymentData = data.data;

    res.json({
      success: paymentData.status === 'success',
      reference: paymentData.reference,
      amount: paymentData.amount,
      paidAt: paymentData.paid_at,
      channel: paymentData.channel
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Plant Identification Routes
app.post('/api/plants/identifications', authMiddleware, async (req, res) => {
  try {
    const identification = {
      userId: req.userId,
      plantData: req.body.plantData,
      createdAt: new Date()
    };

    const result = await db.collection('plant_identifications').insertOne(identification);
    identification._id = result.insertedId;

    res.json(identification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save identification' });
  }
});

app.get('/api/plants/identifications/:userId', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const identifications = await db.collection('plant_identifications')
      .find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    res.json(identifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch identifications' });
  }
});

// Saved Plants Routes
app.get('/api/plants/saved/:userId', authMiddleware, async (req, res) => {
  try {
    const plants = await db.collection('saved_plants')
      .find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(plants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch saved plants' });
  }
});

app.post('/api/plants/saved', authMiddleware, async (req, res) => {
  try {
    const plant = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('saved_plants').insertOne(plant);
    plant._id = result.insertedId;

    res.json(plant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save plant' });
  }
});

app.patch('/api/plants/saved/:plantId', authMiddleware, async (req, res) => {
  try {
    const result = await db.collection('saved_plants').findOneAndUpdate(
      { _id: new ObjectId(req.params.plantId) },
      {
        $set: {
          ...req.body,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    res.json(result.value);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plant' });
  }
});

app.delete('/api/plants/saved/:plantId', authMiddleware, async (req, res) => {
  try {
    await db.collection('saved_plants').deleteOne({
      _id: new ObjectId(req.params.plantId)
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plant' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function startServer() {
  await connectToMongoDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 PlantGenius Backend API running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : '⚠️  MISSING'}`);
    console.log(`💳 Paystack: ${process.env.PAYSTACK_SECRET_KEY ? 'Configured' : '⚠️  MISSING'}\n`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing MongoDB connection...');
  await mongoClient.close();
  process.exit(0);
});

startServer().catch(console.error);
