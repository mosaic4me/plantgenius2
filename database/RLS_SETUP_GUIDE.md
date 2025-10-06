# Supabase Row Level Security (RLS) Setup Guide

**Purpose**: Secure PlantGenius user data by implementing database-level access controls
**Priority**: CRITICAL for production deployment
**Estimated Time**: 15-20 minutes
**Created**: 2025-10-06

---

## 📋 OVERVIEW

Row Level Security (RLS) is a PostgreSQL feature that restricts which rows users can access in database tables. This is **essential** for multi-user applications to prevent users from accessing each other's data.

### Why RLS is Critical

Without RLS:
- ❌ Any authenticated user could access ALL users' data
- ❌ User A could read User B's plant identifications
- ❌ User A could modify User B's profile
- ❌ Subscription data would be publicly accessible

With RLS:
- ✅ Users can only access their own data
- ✅ Server-side enforcement (can't be bypassed from client)
- ✅ Automatic security at the database level
- ✅ Protection against SQL injection and unauthorized access

---

## 🚀 DEPLOYMENT PROCEDURE

### Step 1: Access Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in to your account
3. Select your PlantGenius project
4. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute RLS Policies

1. Open the file: `database/migrations/001_rls_policies.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
5. Verify success message appears

**Expected Output**:
```
Success. No rows returned.
```

### Step 3: Validation

Run the following validation queries in SQL Editor:

#### Test 1: Verify RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'subscriptions', 'plant_identifications', 'saved_plants', 'daily_scans');
```

**Expected**: All tables should show `rowsecurity = true`

#### Test 2: Verify Policies Exist
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected**: Should return multiple policy rows for each table

#### Test 3: Test Access as User
```sql
-- This should only return YOUR profile
SELECT * FROM profiles WHERE id = auth.uid();

-- This should return 0 rows (can't access other users)
SELECT count(*) FROM profiles WHERE id != auth.uid();
```

---

## 📊 POLICY DETAILS

### Profiles Table

| Policy | Type | Rule |
|--------|------|------|
| Users can view own profile | SELECT | `auth.uid() = id` |
| Users can update own profile | UPDATE | `auth.uid() = id` |
| Users can insert own profile | INSERT | `auth.uid() = id` |

**Behavior**:
- Users can read and update only their own profile
- Profile creation happens during sign-up
- Admin access requires service role (server-side only)

### Subscriptions Table

| Policy | Type | Rule |
|--------|------|------|
| Users can view own subscriptions | SELECT | `auth.uid() = user_id` |
| Service can manage subscriptions | ALL | Service role only |

**Behavior**:
- Users can view their subscription status
- Only backend services can create/update subscriptions
- Prevents client-side subscription manipulation

**SECURITY NOTE**: This is why server-side payment verification is critical. Client cannot bypass this policy to activate subscriptions.

### Plant Identifications Table

| Policy | Type | Rule |
|--------|------|------|
| Users can manage own plant identifications | ALL | `auth.uid() = user_id` |

**Behavior**:
- Full CRUD access to own plant history
- Complete isolation between users
- Users cannot see other users' scans

### Saved Plants Table

| Policy | Type | Rule |
|--------|------|------|
| Users can manage own saved plants | ALL | `auth.uid() = user_id` |

**Behavior**:
- Users can save/unsave their own plants
- Bookmarks are private to each user
- Full control over saved collection

### Daily Scans Table

| Policy | Type | Rule |
|--------|------|------|
| Users can view own daily scans | SELECT | `auth.uid() = user_id` |
| Users can manage own daily scans | INSERT/UPDATE | `auth.uid() = user_id` |

**Behavior**:
- Users can track their scan usage
- Prevents scan count manipulation
- Daily limits enforced per user

---

## 🔍 TESTING PROCEDURES

### Test 1: Single User Access

1. Sign in to your app with User A
2. Create some plant identifications
3. Save some plants
4. Verify data appears in the app

### Test 2: Cross-User Isolation

1. Sign in with User A, note user ID
2. Create 2-3 plant identifications
3. Sign out and sign in with User B
4. Verify User B sees ZERO of User A's plants
5. Create some plants as User B
6. Verify User B only sees their own data

### Test 3: Database Direct Access

Using Supabase Table Editor:

1. Navigate to **Table Editor** → **profiles**
2. You should see ALL user profiles (you're authenticated as admin)
3. Now run this query in **SQL Editor** as an authenticated user:
   ```sql
   SELECT * FROM profiles;
   ```
4. You should only see YOUR profile (RLS enforced)

### Test 4: Subscription Security

1. As a non-subscribed user, attempt to access subscription features
2. Verify app correctly shows "no active subscription"
3. Try to modify subscription record via Supabase client
4. Verify operation fails (only service role can modify)

---

## ⚠️ COMMON ISSUES & TROUBLESHOOTING

### Issue: Policies Not Applied

**Symptoms**: Can still see other users' data

**Solutions**:
1. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';
   ```
2. Check if policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```
3. Re-run the migration script
4. Clear application cache and re-authenticate

### Issue: Can't Insert Own Data

**Symptoms**: Insert operations fail with permission error

**Solutions**:
1. Verify user is authenticated: `SELECT auth.uid();` should return a UUID
2. Check INSERT policy exists for the table
3. Ensure `user_id` column matches `auth.uid()`
4. Verify your JWT token is valid

### Issue: Service Role Can't Manage Data

**Symptoms**: Backend operations fail

**Solutions**:
1. Verify you're using the `service_role` key (not `anon` key) for server operations
2. Service role bypasses RLS by default
3. Check your backend is using correct Supabase client configuration

---

## 🔒 SECURITY BEST PRACTICES

### DO:
- ✅ Always use RLS in production
- ✅ Test policies with multiple users before production
- ✅ Use service role only in secure backend environments
- ✅ Monitor database logs for policy violations
- ✅ Regularly audit policies for security holes

### DON'T:
- ❌ Disable RLS in production (even temporarily)
- ❌ Use service role keys in client-side code
- ❌ Create policies that allow cross-user access
- ❌ Skip testing with real multi-user scenarios
- ❌ Deploy without validating all policies work

---

## 📈 PERFORMANCE CONSIDERATIONS

### Impact on Queries

RLS policies add a WHERE clause to all queries:

**Without RLS**:
```sql
SELECT * FROM profiles;
```

**With RLS**:
```sql
SELECT * FROM profiles WHERE id = auth.uid();
```

### Performance Notes:
- **Minimal overhead**: Policies are compiled and cached
- **Indexed properly**: Ensure `user_id` columns have indexes
- **No N+1 issues**: Policies don't cause additional queries
- **Fast execution**: PostgreSQL-native, highly optimized

### Recommended Indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_identifications_user_id ON plant_identifications(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_plants_user_id ON saved_plants(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_scans_user_id ON daily_scans(user_id);
```

---

## 🔄 ROLLBACK PROCEDURE

**WARNING**: Only use in development/staging, NEVER in production with real user data.

To temporarily disable RLS for debugging:

```sql
-- Disable RLS (NOT FOR PRODUCTION)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE plant_identifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_plants DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scans DISABLE ROW LEVEL SECURITY;
```

To re-enable:

```sql
-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_identifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scans ENABLE ROW LEVEL SECURITY;
```

---

## 📞 SUPPORT

### RLS Documentation:
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

### Common Questions:

**Q: Do I need RLS if I'm the only user?**
A: Yes! Even for single-user apps, RLS is good practice and prepares for future multi-user scenarios.

**Q: Can users bypass RLS from the client?**
A: No. RLS is enforced at the database level and cannot be bypassed without database credentials.

**Q: What if I need to share data between users?**
A: Create specific policies for shared data scenarios (e.g., public plant collections).

**Q: How do I allow admin access?**
A: Use service role for backend admin operations, or create admin-specific policies.

---

**Status**: Ready for production deployment
**Next Steps**: Execute policies in Supabase dashboard, then test thoroughly before production release

**CRITICAL**: Do not deploy PlantGenius to production without these RLS policies in place.
