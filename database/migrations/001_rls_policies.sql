-- =====================================================
-- PlantGenius Row Level Security (RLS) Policies
-- =====================================================
--
-- PURPOSE: Secure user data by ensuring users can only
-- access their own data in the database
--
-- CREATED: 2025-10-06
-- STATUS: Ready for production deployment
--
-- IMPORTANT: Apply these policies in Supabase dashboard
-- SQL Editor before production deployment
-- =====================================================

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plant_identifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saved_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_scans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- DROP existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- SELECT: Users can only view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INSERT: Users can create their own profile on signup
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- =====================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service can manage subscriptions" ON subscriptions;

-- SELECT: Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: Only service role can manage subscriptions
-- (Payment verification happens server-side)
CREATE POLICY "Service can manage subscriptions"
ON subscriptions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- PLANT_IDENTIFICATIONS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own plant identifications" ON plant_identifications;

-- FULL CRUD: Users have complete control over their plant history
CREATE POLICY "Users can manage own plant identifications"
ON plant_identifications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- SAVED_PLANTS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own saved plants" ON saved_plants;

-- FULL CRUD: Users have complete control over their saved plants
CREATE POLICY "Users can manage own saved plants"
ON saved_plants FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DAILY_SCANS TABLE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own daily scans" ON daily_scans;
DROP POLICY IF EXISTS "Users can manage own daily scans" ON daily_scans;

-- SELECT: Users can view their own scan counts
CREATE POLICY "Users can view own daily scans"
ON daily_scans FOR SELECT
USING (auth.uid() = user_id);

-- INSERT/UPDATE: Users can update their own scan counts
CREATE POLICY "Users can manage own daily scans"
ON daily_scans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily scans"
ON daily_scans FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================
--
-- Run these queries to verify RLS policies are working:
--
-- 1. Test as authenticated user:
--    SELECT * FROM profiles WHERE id = auth.uid();
--    -- Should return only the current user's profile
--
-- 2. Test cross-user access (should fail):
--    SELECT * FROM profiles WHERE id != auth.uid();
--    -- Should return 0 rows
--
-- 3. Test subscriptions:
--    SELECT * FROM subscriptions WHERE user_id = auth.uid();
--    -- Should return only current user's subscriptions
--
-- 4. Test plant identifications:
--    SELECT * FROM plant_identifications WHERE user_id = auth.uid();
--    -- Should return only current user's plants
--
-- =====================================================

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
--
-- To disable RLS (NOT recommended for production):
--
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE plant_identifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE saved_plants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_scans DISABLE ROW LEVEL SECURITY;
--
-- =====================================================

-- =====================================================
-- DEPLOYMENT NOTES
-- =====================================================
--
-- 1. Review all policies above
-- 2. Open Supabase Dashboard → SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- 5. Run validation queries to confirm
-- 6. Test in application with multiple users
-- 7. Monitor for any access errors in logs
--
-- SECURITY: These policies are essential for data
-- protection. Do not deploy to production without them.
-- =====================================================
