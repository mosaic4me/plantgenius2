/**
 * PlantGenius Backend API - Enhanced Version
 * Express + MongoDB REST API with full production features
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requestLogger, errorLogger } from './middleware/logger.js';
import {
  validateSignup,
  validateSignin,
  validateUserId,
  validatePaymentReference,
  sanitizeInput
} from './middleware/validation.js';
import {
  sendPasswordResetEmail,
  sendWelcomeEmail
} from './services/email.js';
import {
  verifyPaystackSignature,
  handleWebhookEvent
} from './services/webhooks.js';

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

    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('subscriptions').createIndex({ userId: 1, status: 1 });
    await db.collection('daily_scans').createIndex(
      { userId: 1, scanDate: 1 },
      { unique: true }
    );
    await db.collection('saved_plants').createIndex({ userId: 1 });
    await db.collection('plant_identifications').createIndex({ userId: 1, createdAt: -1 });
    console.log('✅ Database indexes created');
  } catch (error) {
    console.warn('⚠️  Index creation warning:', error.message);
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(requestLogger);
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

// Health check with dependencies
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Check MongoDB
    await db.admin().ping();
    health.mongodb = 'connected';
  } catch (error) {
    health.mongodb = 'disconnected';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// Auth Routes
app.post('/api/auth/signup', validateSignup, async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedFullName = sanitizeInput(fullName);

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      email: sanitizedEmail,
      password: hashedPassword,
      fullName: sanitizedFullName || null,
      avatarUrl: null,
      authProvider: 'email',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email: sanitizedEmail },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Send welcome email (non-blocking)
    sendWelcomeEmail(sanitizedEmail, sanitizedFullName).catch(err =>
      console.warn('Welcome email failed:', err.message)
    );

    const user = await db.collection('users').findOne({ _id: result.insertedId });
    delete user.password;

    res.json({ user, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/auth/signin', validateSignin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    // Find user
    const user = await db.collection('users').findOne({ email: sanitizedEmail });
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
      { userId: user._id.toString(), email: sanitizedEmail },
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

// Password Reset Routes
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    const user = await db.collection('users').findOne({ email: sanitizedEmail });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If account exists, reset email sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token (expires in 1 hour)
    await db.collection('password_resets').insertOne({
      userId: user._id.toString(),
      token: hashedToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });

    // Send reset email
    await sendPasswordResetEmail(sanitizedEmail, resetToken);

    res.json({ message: 'If account exists, reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.post('/api/auth/reset-password-confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid token or password' });
    }

    // Hash token to compare
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetRecord = await db.collection('password_resets').findOne({
      token: hashedToken,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.collection('users').updateOne(
      { _id: new ObjectId(resetRecord.userId) },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );

    // Delete used token
    await db.collection('password_resets').deleteOne({ _id: resetRecord._id });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// User Routes
app.get('/api/users/:userId', authMiddleware, validateUserId, async (req, res) => {
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

app.patch('/api/users/:userId', authMiddleware, validateUserId, async (req, res) => {
  try {
    const { fullName, avatarUrl } = req.body;

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(req.params.userId) },
      {
        $set: {
          fullName: sanitizeInput(fullName),
          avatarUrl: sanitizeInput(avatarUrl),
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
app.post('/api/payments/verify', authMiddleware, validatePaymentReference, async (req, res) => {
  try {
    const { reference } = req.body;

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

// Paystack Webhook Handler
app.post('/api/webhooks/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const payload = req.body;

    // Verify signature
    if (!verifyPaystackSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(payload.toString());

    // Handle webhook event
    const result = await handleWebhookEvent(db, event);

    if (!result.success) {
      console.error('Webhook handling failed:', result.error);
      return res.status(500).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
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
app.use(errorLogger);
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
    console.log(`💳 Paystack: ${process.env.PAYSTACK_SECRET_KEY ? 'Configured' : '⚠️  MISSING'}`);
    console.log(`📧 Email: ${process.env.SMTP2GO_API_KEY ? 'Configured' : '⚠️  MISSING'}\n`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing MongoDB connection...');
  await mongoClient.close();
  process.exit(0);
});

startServer().catch(console.error);
