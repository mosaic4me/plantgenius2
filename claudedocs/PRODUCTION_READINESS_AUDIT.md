# 🔍 PlantGenius Production Readiness Audit
**Date**: October 14, 2025
**Status**: ❌ NOT READY - Critical Issues Found
**Backend**: ✅ Live at https://api.plantsgenius.site

---

## 🚨 CRITICAL ISSUES (Must Fix Before Build)

### 1. **Environment Variables Not Configured in app.json**
**Severity**: 🔴 CRITICAL - App Will Crash on Launch
**Location**: `app.json` lines 58-67

**Problem**:
```json
{
  "extra": {
    "plantnetApiKey": "",           // ❌ EMPTY
    "mongodbApiUrl": "",             // ❌ EMPTY - API won't connect!
    "paystackPublicKey": "",         // ❌ EMPTY - Payments will fail
    "sentryEnabled": false           // ❌ Error tracking disabled
  }
}
```

**Impact**:
- ❌ API calls to backend will fail (no MONGODB_API_URL)
- ❌ Plant identification won't work (no PlantNet API key)
- ❌ Payments will fail (no Paystack key)
- ❌ Errors won't be tracked in production

**Fix Required**:
The `app.json` file is missing all environment variables. The `app.config.ts` correctly loads from `.env`, but `app.json` needs to be updated or removed to avoid conflicts.

---

### 2. **app.json vs app.config.ts Conflict**
**Severity**: 🔴 CRITICAL - Configuration Confusion

**Problem**:
- Two conflicting configuration files exist
- `app.json` has empty values
- `app.config.ts` correctly loads from `.env`
- Expo may use `app.json` instead of `app.config.ts`

**Fix**:
Delete `app.json` or rename it to `app.json.backup` since `app.config.ts` is the correct configuration file.

---

### 3. **Sentry Package Not Installed**
**Severity**: 🟡 MEDIUM - Error Tracking Disabled

**Problem**:
```typescript
// utils/sentry.ts
if (config.sentryEnabled && config.sentryDsn) {
  try {
    Sentry = require('@sentry/react-native'); // ❌ Package not in dependencies
  } catch (error) {
    logger.warn('Sentry package not installed');
  }
}
```

**Impact**:
- Production errors won't be tracked
- No crash reporting
- No performance monitoring

**Fix**:
```bash
npm install @sentry/react-native
npx @sentry/wizard@latest -i reactNative -p ios android
```

Or disable Sentry if not needed:
```env
SENTRY_ENABLED=false
```

---

## ⚠️ HIGH PRIORITY ISSUES

### 4. **MongoDB API Client - Missing Error Recovery**
**Location**: `lib/mongodb.ts` lines 93-96

**Problem**:
```typescript
if (!this.apiUrl || this.apiUrl === 'http://localhost:3000/api') {
  logger.warn('MongoDB API URL not configured - backend communication will fail');
  // ❌ Continues anyway - should throw error or show UI message
}
```

**Impact**:
- App will silently fail when trying to communicate with backend
- Users will see broken authentication and features

**Recommendation**:
Add proper error handling with user-facing messages.

---

### 5. **Auth Service - Direct MongoDB Client Usage**
**Location**: `services/auth.ts` lines 333, 354, 374, 396

**Problem**:
Google/Apple auth methods call `mongoClient` directly, but these methods don't exist on the backend yet.

**Files Affected**:
- `createOrUpdateGoogleUser()` - line 333
- `createOrUpdateAppleUser()` - line 374

**Impact**:
- Google Sign In will crash
- Apple Sign In will crash
- Only email/password auth will work

**Fix Required**:
Either:
1. Implement these backend API endpoints
2. Or wrap in try-catch with fallback

---

### 6. **Payment Verification Security**
**Location**: `services/paystack.ts` line 94

**Status**: ✅ **FIXED** - Now uses backend verification
**Previous Issue**: Was doing fake client-side verification

**Current Implementation**:
```typescript
const response = await fetch(`${config.mongodbApiUrl}/payments/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reference }),
});
```

**Backend Status**: ⚠️ **NEEDS VERIFICATION**
Check that `/payments/verify` endpoint exists on backend.

---

## 📋 CONFIGURATION ISSUES

### 7. **Missing App Icon and Splash Screen**
**Status**: Not specified in configuration

**Required**:
- App icon (1024x1024 PNG)
- Splash screen
- Adaptive icon (Android)

---

### 8. **Missing Play Store Assets**
For production release:
- Feature graphic (1024x500)
- Screenshots (multiple devices)
- App description
- Privacy policy URL
- Terms of service URL

---

## ✅ WHAT'S WORKING WELL

### Backend Infrastructure ✅
- Production API live at https://api.plantsgenius.site
- MongoDB connected successfully
- Cloudflare SSL configured
- PM2 auto-restart enabled
- Nginx reverse proxy working
- Health check passing

### Mobile App Architecture ✅
- Error Boundary implemented
- React Query for data fetching
- Proper context providers
- TypeScript throughout
- Clean separation of concerns

### Security ✅
- No hardcoded credentials in code
- Environment variables used correctly
- Sentry filters sensitive data from breadcrumbs
- Payment verification via backend

---

## 🔧 REQUIRED FIXES BEFORE BUILD

### Priority 1: Configuration (BLOCKS BUILD)

1. **Delete or rename `app.json`**
   ```bash
   mv app.json app.json.backup
   ```

2. **Verify `.env` has production values**
   ```env
   MONGODB_API_URL=https://api.plantsgenius.site/api  ✅ DONE
   PLANTNET_API_KEY=[REDACTED]      ✅ EXISTS
   PAYSTACK_PUBLIC_KEY=sk_live_[REDACTED]  ✅ EXISTS
   ```

3. **Test API connectivity**
   ```bash
   curl https://api.plantsgenius.site/health
   # Should return: {"status":"ok"}
   ```

### Priority 2: Auth Fixes (PREVENTS CRASHES)

4. **Add error handling to Google/Apple auth**

   Option A: Wrap in try-catch
   ```typescript
   private async createOrUpdateGoogleUser(googleUser: any): Promise<AuthUser> {
     try {
       const profile = await mongoClient.getUserProfile(googleUser.id);
       // ... existing code
     } catch (error) {
       logger.error('Google user creation failed', error);
       throw new AuthError('Authentication failed. Please try email login.');
     }
   }
   ```

   Option B: Disable Google/Apple sign-in temporarily
   ```typescript
   // In AuthContext, check before calling:
   if (!config.googleAndroidClientId) {
     return { data: null, error: { message: 'Google Sign In not configured', code: 'NOT_CONFIGURED' } };
   }
   ```

### Priority 3: Backend API Endpoints

5. **Verify these backend endpoints exist:**
   - ✅ `/health` - Working
   - ✅ `/api/auth/signup` - Tested successfully
   - ✅ `/api/auth/signin` - Should work
   - ⚠️ `/api/users/:userId` - Needs verification
   - ⚠️ `/api/payments/verify` - Needs verification
   - ⚠️ `/api/subscriptions/active/:userId` - Needs verification
   - ⚠️ `/api/scans/:userId/:date` - Needs verification

---

## 🚀 BUILD INSTRUCTIONS (After Fixes)

### Step 1: Apply Fixes
```bash
# 1. Remove conflicting app.json
mv app.json app.json.backup

# 2. Verify .env is correct
cat .env | grep MONGODB_API_URL
# Should show: https://api.plantsgenius.site/api

# 3. Install missing dependencies (if using Sentry)
npm install @sentry/react-native

# 4. Clear caches
npx expo start --clear
```

### Step 2: Test Locally First
```bash
# Start development build
npx expo start

# Test on Android emulator:
# 1. Sign up with email
# 2. Sign in
# 3. Try plant identification
# 4. Check subscription page
```

### Step 3: Build Production APK
```bash
# Build with EAS
eas build --platform android --profile production

# Or local build
npx expo run:android --variant release
```

---

## 📊 RISK ASSESSMENT

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| Empty app.json config | 🔴 Critical | App won't connect to backend | ❌ Not Fixed |
| Sentry not installed | 🟡 Medium | No error tracking | ❌ Not Fixed |
| Google/Apple auth crashes | 🟡 Medium | OAuth fails | ❌ Not Fixed |
| Missing backend endpoints | 🟡 Medium | Features may fail | ⚠️ Unknown |

---

## ✅ PRE-BUILD CHECKLIST

Before running build:

- [ ] Remove or rename `app.json`
- [ ] Verify `.env` has production API URL
- [ ] Test signup/login on emulator
- [ ] Test plant identification
- [ ] Install Sentry or disable it
- [ ] Add error handling to OAuth methods
- [ ] Test backend endpoints exist
- [ ] Clear Expo cache
- [ ] Test on physical device (optional but recommended)

---

## 🎯 RECOMMENDATION

**DO NOT BUILD YET** - Fix critical issues first.

**Estimated Fix Time**: 30-60 minutes

**Safe Build Order**:
1. Fix configuration (Priority 1) - 10 min
2. Test locally - 10 min
3. Fix auth crashes (Priority 2) - 20 min
4. Verify backend endpoints - 10 min
5. Final test - 10 min
6. Build APK - 5-15 min

---

## 📞 NEXT STEPS

1. I'll fix the critical configuration issues
2. Add error handling to prevent crashes
3. Test the fixes
4. Then proceed with the build

**Ready to proceed with fixes?**
