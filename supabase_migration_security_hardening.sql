-- ==========================================================================
-- SECURITY HARDENING: block client-side writes to authorization-sensitive
-- columns on saas_users (role, subscription tier/plan, usage_limit).
-- ==========================================================================
--
-- WHY THIS EXISTS
-- ----------------
-- The app's RLS policy on saas_users is `FOR ALL USING (true)` — fully
-- permissive. The browser talks to Supabase directly with the public anon
-- key (see src/services/dbClient.ts), and src/services/UserService.ts
-- upserts the ENTIRE user object the client has in memory, including
-- `role`, `subscription`, `subscription_tier`, and `usage_limit` — with no
-- server-side validation anywhere in that path.
--
-- Concretely, today, any authenticated user can open the browser console and
-- run:
--   await supabaseClient.from('saas_users').update({ role: 'super_admin' }).eq('id', myOwnId)
-- and instantly become a full admin — the app's own authorization logic
-- (src/utils/rbac.ts isAdminRole, src/context/AppContext.tsx isMasterOwner,
-- src/config/plans.ts getPlanLimits) all read straight from this same
-- client-writable column. The same applies to granting yourself an
-- unlimited billing plan via `subscription`/`subscription_tier`/
-- `usage_limit`.
--
-- WHAT THIS MIGRATION DOES
-- -------------------------
-- Adds a BEFORE UPDATE trigger on saas_users that rejects any UPDATE which
-- changes role, subscription, subscription_tier, or usage_limit UNLESS the
-- request is authenticated as the Supabase service_role (i.e. came from
-- server-side code using SUPABASE_SERVICE_ROLE_KEY — see
-- server/database/supabaseClient.ts's supabaseAdmin, which the admin panel
-- and server-side billing code already use). Every other column
-- (name, avatar_url, usage_current, storage_used_mb, templates_used,
-- projects_active, status, subscription_details, company) is UNCHANGED by
-- this migration and remains client-writable exactly as before — this is
-- intentionally narrow in scope. Those columns also being client-writable
-- is its own, lower-severity issue (a user can inflate/deflate their own
-- usage counters), but locking them down too risks breaking the app's
-- current self-service usage-tracking flow (UserService.upsertUser writes
-- these directly from the browser on every upload/render) in ways that
-- can't be verified without testing against the live app — deliberately
-- left alone here rather than guessed at.
--
-- WHAT STILL NEEDS TO HAPPEN AFTER THIS (not covered by this migration)
-- -----------------------------------------------------------------------
-- This stops the WORST exploit (self-granted admin / unlimited billing)
-- but the underlying architecture issue remains: role changes and
-- subscription changes should ideally go through validated SERVER
-- endpoints (the admin panel's PATCH /api/admin/users/:id already has an
-- owner-tier check as of tonight's fixes; the subscription/billing side —
-- AppContext.tsx's changeSubscription/triggerMockRenewal — currently has
-- NO server backing at all, it's a client-side mock that was never wired
-- up to RenderService's sibling PaymentService/SubscriptionService upsert
-- calls. That's a product decision (what's the real billing flow meant to
-- be?) that needs your call, not something to guess at silently in an
-- overnight pass.
--
-- HOW TO APPLY
-- ------------
-- 1. Open the Supabase dashboard → SQL Editor for this project.
-- 2. Paste and run this entire file.
-- 3. Test: as a non-owner account, try changing your own role via the
--    browser console (the snippet above) — it should now fail with the
--    error message below. Then confirm the admin panel can STILL change a
--    user's role/plan normally (that goes through supabaseAdmin /
--    service_role, which this trigger allows).
--
-- ==========================================================================

CREATE OR REPLACE FUNCTION prevent_client_auth_column_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.subscription IS DISTINCT FROM OLD.subscription OR
    NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier OR
    NEW.usage_limit IS DISTINCT FROM OLD.usage_limit
  ) THEN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Alterar role, subscription, subscription_tier ou usage_limit requer privilégios de servidor (service_role). Use o painel administrativo.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_client_auth_column_changes ON saas_users;
CREATE TRIGGER trg_prevent_client_auth_column_changes
  BEFORE UPDATE ON saas_users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_client_auth_column_changes();
