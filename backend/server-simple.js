// PlantGenius Backend - Simplified In-Memory Version for Testing
// This version uses in-memory storage instead of MongoDB for quick testing

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'local-test-secret-key-change-in-production';

// In-memory storage (temporary for testing)
const storage = {
  users: new Map(),
  subscriptions: new Map(),
  plants: new Map(),
  savedPlants: new Map(),
  scans: new Map(),
  passwordResets: new Map(),
};

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Input validation
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password && password.length >= 6;

// ================== ROUTES ==================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    storage: 'in-memory',
    users: storage.users.size,
  });
});

// ================== AUTH ROUTES ==================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    if (!password || !validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = Array.from(storage.users.values()).find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = crypto.randomUUID();
    const user = {
      _id: userId,
      email,
      password: hashedPassword,
      fullName: fullName || '',
      createdAt: new Date(),
      isPremium: false,
    };

    storage.users.set(userId, user);

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Sign In
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = Array.from(storage.users.values()).find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Signin failed' });
  }
});

// Password Reset Request
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = Array.from(storage.users.values()).find(u => u.email === email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    storage.passwordResets.set(hashedToken, {
      userId: user._id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    console.log(`Password reset token for ${email}: ${resetToken}`);
    res.json({ message: 'Password reset token generated (check server logs)' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to generate reset token' });
  }
});

// ================== USER ROUTES ==================

// Get user
app.get('/api/users/:userId', authenticateToken, (req, res) => {
  try {
    const user = storage.users.get(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user
app.put('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const user = storage.users.get(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { fullName, email } = req.body;
    if (fullName) user.fullName = fullName;
    if (email && validateEmail(email)) user.email = email;

    storage.users.set(req.params.userId, user);

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ================== SUBSCRIPTION ROUTES ==================

// Get active subscription
app.get('/api/subscriptions/active/:userId', authenticateToken, (req, res) => {
  try {
    const subscription = storage.subscriptions.get(req.params.userId);
    if (!subscription || subscription.status !== 'active') {
      return res.status(404).json({ error: 'No active subscription' });
    }
    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// Create subscription
app.post('/api/subscriptions', authenticateToken, (req, res) => {
  try {
    const { userId, planType, billingCycle } = req.body;

    const subscription = {
      userId,
      planType: planType || 'premium',
      status: 'active',
      billingCycle: billingCycle || 'monthly',
      startDate: new Date(),
      endDate: new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000),
    };

    storage.subscriptions.set(userId, subscription);

    const user = storage.users.get(userId);
    if (user) {
      user.isPremium = true;
      storage.users.set(userId, user);
    }

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ================== SCAN ROUTES ==================

// Increment daily scan count
app.post('/api/scans/:userId/:date/increment', authenticateToken, (req, res) => {
  try {
    const { userId, date } = req.params;
    const key = `${userId}-${date}`;

    const scan = storage.scans.get(key) || { userId, date, count: 0 };
    scan.count += 1;
    storage.scans.set(key, scan);

    res.json({ count: scan.count, date });
  } catch (error) {
    console.error('Increment scan error:', error);
    res.status(500).json({ error: 'Failed to increment scan count' });
  }
});

// Get scan count
app.get('/api/scans/:userId/:date', authenticateToken, (req, res) => {
  try {
    const { userId, date } = req.params;
    const key = `${userId}-${date}`;
    const scan = storage.scans.get(key) || { userId, date, count: 0 };
    res.json(scan);
  } catch (error) {
    console.error('Get scan error:', error);
    res.status(500).json({ error: 'Failed to get scan count' });
  }
});

// ================== PLANT ROUTES ==================

// Save plant identification
app.post('/api/plants/saved', authenticateToken, (req, res) => {
  try {
    const { userId, plant } = req.body;

    const savedPlant = {
      _id: crypto.randomUUID(),
      userId,
      ...plant,
      savedAt: new Date(),
    };

    if (!storage.savedPlants.has(userId)) {
      storage.savedPlants.set(userId, []);
    }
    storage.savedPlants.get(userId).push(savedPlant);

    res.status(201).json(savedPlant);
  } catch (error) {
    console.error('Save plant error:', error);
    res.status(500).json({ error: 'Failed to save plant' });
  }
});

// Get saved plants
app.get('/api/plants/saved/:userId', authenticateToken, (req, res) => {
  try {
    const plants = storage.savedPlants.get(req.params.userId) || [];
    res.json(plants);
  } catch (error) {
    console.error('Get saved plants error:', error);
    res.status(500).json({ error: 'Failed to get saved plants' });
  }
});

// ================== PAYMENT ROUTES ==================

// Verify payment (mock for testing)
app.post('/api/payments/verify', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.body;

    // Mock verification - in real app, call Paystack API
    console.log(`Mock payment verification for reference: ${reference}`);

    res.json({
      status: 'success',
      reference,
      amount: 5000,
      currency: 'NGN',
      verified: true,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ================== START SERVER ==================

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 PlantGenius Backend Server (IN-MEMORY TEST MODE)');
  console.log('📡 Environment:', process.env.NODE_ENV || 'development');
  console.log('🔌 Server running on port', PORT);
  console.log('💾 Storage: In-Memory (temporary for testing)');
  console.log('🏥 Health check: http://localhost:' + PORT + '/health');
  console.log('📚 API Base: http://localhost:' + PORT + '/api');
  console.log('');
  console.log('⚠️  NOTE: This is a simplified server for testing.');
  console.log('   Data will be lost when server restarts.');
  console.log('   Use server-enhanced.js with MongoDB for production.');
  console.log('');
});
