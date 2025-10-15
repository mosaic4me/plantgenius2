# PlantGenius Backend API

Production-ready Express + MongoDB backend for PlantGenius mobile app.

## Features

✅ **Authentication**: Email/Password with JWT tokens
✅ **User Management**: Profile CRUD operations
✅ **Subscriptions**: Active subscription tracking
✅ **Daily Scans**: Scan count management
✅ **Payment Verification**: Secure Paystack integration
✅ **Plant Data**: Identification history and saved plants
✅ **Security**: Helmet, CORS, rate limiting, bcrypt hashing
✅ **Production Ready**: Environment-based configuration

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/

# Generate JWT secret: openssl rand -base64 32
JWT_SECRET=your_super_secret_jwt_key_here

# Paystack secret key from dashboard
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
```

### 3. Run Locally

```bash
npm run dev
```

API will be available at `http://localhost:3000`

## Deployment Options

### Option 1: Railway (Recommended - Free Tier)

1. **Create Railway account**: https://railway.app
2. **Create new project** → Deploy from GitHub
3. **Add MongoDB**: Railway Marketplace → MongoDB
4. **Set environment variables** in Railway dashboard:
   - `PORT` (Railway sets automatically)
   - `MONGODB_URI` (from Railway MongoDB plugin)
   - `JWT_SECRET` (generate with: `openssl rand -base64 32`)
   - `PAYSTACK_SECRET_KEY`
   - `ALLOWED_ORIGINS` (your mobile app URL)
5. **Deploy**: Railway auto-deploys on push

**Cost**: Free tier includes 500 hours/month

### Option 2: Render (Free Tier)

1. **Create Render account**: https://render.com
2. **New Web Service** → Connect GitHub repo
3. **Configure**:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
4. **Add environment variables** in Render dashboard
5. **Create MongoDB** separately (MongoDB Atlas free tier)

**Cost**: Free tier available

### Option 3: Heroku

1. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli
2. **Login**: `heroku login`
3. **Create app**: `heroku create plantgenius-api`
4. **Add MongoDB**: `heroku addons:create mongodbatlas:free`
5. **Set config vars**:
   ```bash
   heroku config:set JWT_SECRET=$(openssl rand -base64 32)
   heroku config:set PAYSTACK_SECRET_KEY=sk_live_xxx
   ```
6. **Deploy**: `git push heroku master`

**Cost**: Free dyno available (sleeps after 30 min)

### Option 4: Vercel (Serverless)

Vercel works but requires converting to serverless functions. Railway or Render are easier for this Express app.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `MONGODB_DB_NAME` | No | Database name (default: plantgenius) |
| `JWT_SECRET` | **Yes** | Secret key for JWT tokens |
| `PAYSTACK_SECRET_KEY` | **Yes** | Paystack secret key |
| `ALLOWED_ORIGINS` | No | CORS origins (comma-separated) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (default: 15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/signin` - Login user

### Users
- `GET /api/users/:userId` - Get user profile
- `PATCH /api/users/:userId` - Update user profile

### Subscriptions
- `GET /api/subscriptions/active/:userId` - Get active subscription
- `POST /api/subscriptions` - Create subscription

### Daily Scans
- `GET /api/scans/:userId/:date` - Get scan count for date
- `POST /api/scans/:userId/:date/increment` - Increment scan count

### Payments
- `POST /api/payments/verify` - Verify Paystack payment

### Plant Data
- `POST /api/plants/identifications` - Save plant identification
- `GET /api/plants/identifications/:userId` - Get identification history
- `GET /api/plants/saved/:userId` - Get saved plants
- `POST /api/plants/saved` - Save plant to garden
- `PATCH /api/plants/saved/:plantId` - Update saved plant
- `DELETE /api/plants/saved/:plantId` - Delete saved plant

### Health Check
- `GET /health` - Server health status

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin request control
- **Rate Limiting**: Prevents abuse
- **JWT Authentication**: Secure token-based auth
- **bcrypt**: Password hashing (10 rounds)
- **Environment Variables**: No hardcoded secrets

## MongoDB Collections

- `users` - User profiles and authentication
- `subscriptions` - Premium subscriptions
- `daily_scans` - Daily scan count tracking
- `plant_identifications` - Plant identification history
- `saved_plants` - User's plant garden

## Mobile App Configuration

After deploying, update your mobile app's `.env`:

```env
# Your deployed backend URL
MONGODB_API_URL=https://your-app.railway.app/api
```

## Monitoring

### Logs
- **Railway**: Dashboard → Deployments → Logs
- **Render**: Dashboard → Logs
- **Heroku**: `heroku logs --tail`

### Health Check
```bash
curl https://your-api-url.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-10-06T..."
}
```

## Troubleshooting

### MongoDB Connection Issues
- Verify connection string format
- Check IP whitelist in MongoDB Atlas (allow 0.0.0.0/0 for Railway/Render)
- Ensure database user has correct permissions

### Authentication Errors
- Verify JWT_SECRET is set
- Check token expiration (30 days default)
- Ensure Authorization header format: `Bearer <token>`

### Payment Verification Fails
- Verify PAYSTACK_SECRET_KEY is correct
- Check Paystack dashboard for transaction status
- Ensure webhook URL is configured in Paystack

### CORS Errors
- Add mobile app URL to ALLOWED_ORIGINS
- For Expo: `exp://192.168.x.x:8081,http://localhost:8081`
- For production: `https://yourapp.com`

## Production Checklist

- [ ] MongoDB connection string configured
- [ ] JWT secret generated (32+ characters)
- [ ] Paystack secret key configured
- [ ] CORS origins set correctly
- [ ] Rate limiting enabled
- [ ] Health check endpoint working
- [ ] All environment variables set
- [ ] MongoDB indexes created (optional but recommended)
- [ ] Backup strategy implemented
- [ ] Monitoring/alerts configured

## Support

For issues or questions:
1. Check logs in your hosting platform dashboard
2. Verify environment variables are set
3. Test health check endpoint
4. Review API endpoint documentation above

## License

MIT
