# Database Role System Update

## Overview

This document outlines the changes needed to add new user roles to the Supabase database. The system has been updated from 2 roles (admin, user) to 6 roles (admin, usuario, agente, comercial, invitado, desactivado).

## Current Database Status

**Current Roles in Use:**

-   `admin` - 2 users
-   `user` - 7 users

**Current Constraint:** `CHECK (role = ANY (ARRAY['admin'::text, 'user'::text]))`

**Existing Database Functions:**

-   `prevent_role_escalation()` - Trigger function that prevents non-admins from changing roles
-   `is_admin(user_id uuid)` - Helper function to check if a user is an admin

**Existing RLS Policies:**

-   `Profiles select policy` - Users can view their own profile OR admins can view any profile
-   `Profiles update policy` - Users can update their own profile OR admins can update any profile
-   `Profiles insert policy` - Users can only insert their own profile
-   `Admins can manage invitations` - Only admins can manage invitations

## New Roles

-   **admin** - Full administrative access (existing)
-   **usuario** - Standard user access (replaces "user")
-   **agente** - Agent-level access (new)
-   **comercial** - Commercial/sales access (new)
-   **invitado** - Guest/limited access (new)
-   **desactivado** - Deactivated/disabled user (new)

## Database Changes Required

### Step 1: Update the `role` column constraint in `profiles` table

**IMPORTANT:** This will migrate all 7 existing 'user' roles to 'usuario'.

Run this SQL migration in your Supabase SQL editor:

CORRECT WAY TO MIGRATE SUGESTED BY SUPABASE

```sql
BEGIN;

-- 1) Drop the old constraint first to avoid violations during normalization
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2) Normalize existing data to the new allowed set
UPDATE public.profiles
SET role = 'usuario', updated_at = now()
WHERE role = 'user';

UPDATE public.profiles
SET role = 'invitado', updated_at = now()
WHERE role IS NULL OR role NOT IN ('admin','usuario','agente','comercial','invitado','desactivado');

-- 3) Update the column default to match the new vocabulary
ALTER TABLE public.profiles
ALTER COLUMN role SET DEFAULT 'invitado';

-- 4) Add the new constraint
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin','usuario','agente','comercial','invitado','desactivado'));

COMMIT;
```

### Step 2: Update database functions that reference roles

The `prevent_role_escalation()` function needs to be updated to recognize all new roles:

```sql
-- Update the prevent_role_escalation function to handle new roles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If role is being changed
  IF OLD.role != NEW.role THEN
    -- Check if the user making the change is an admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized role change attempt. Only administrators can modify user roles.';
    END IF;

    -- Validate the new role is one of the allowed roles
    IF NEW.role NOT IN ('admin', 'usuario', 'agente', 'comercial', 'invitado', 'desactivado') THEN
      RAISE EXCEPTION 'Invalid role: %. Allowed roles are: admin, usuario, agente, comercial, invitado, desactivado', NEW.role;
    END IF;

    -- Log the role change for security auditing
    RAISE NOTICE 'Role changed for user % from % to % by admin %',
      NEW.id, OLD.role, NEW.role, auth.uid();
  END IF;

  RETURN NEW;
END;
$function$;
```

**Note:** The `is_admin()` function doesn't need changes as it only checks for 'admin' role.

### Step 3: Update Row Level Security (RLS) policies

The existing RLS policies use the `is_admin()` helper function, so they don't need updates. However, you may want to add role-specific policies for different access levels:

```sql
-- Optional: Add policies for different role levels if needed
-- Example: Allow agentes and comerciales to view other profiles
CREATE POLICY "Agents and commercial users can view profiles"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('agente', 'comercial')
  )
);

-- Example: Prevent desactivado users from accessing anything
-- This should be handled in middleware, not RLS
```

### Step 4: Update invitations RLS policy

The invitations policy references 'admin' explicitly and should work fine, but verify it handles the new role system:

```sql
-- Current policy works fine, but you can make it more robust:
DROP POLICY IF EXISTS "Admins can manage invitations" ON invitations;

CREATE POLICY "Admins can manage invitations"
ON invitations FOR ALL
USING (is_admin(auth.uid()));
```

## Code Changes (Already Completed)

✅ Updated TypeScript type definitions (`utils/auth/helpers.ts`)
✅ Updated Zod validation schemas (`app/admin/actions.ts`)
✅ Updated UI components (`app/admin/roles/components/UserRoleManager.tsx`)
✅ Added commented middleware examples (`utils/supabase/middleware.ts`)

## Middleware Route Protection (To Be Configured)

The middleware has been updated with commented examples. Uncomment and modify as needed:

```typescript
// In utils/supabase/middleware.ts
const PROTECTED_ROUTES = {
	"/admin": "admin",
	"/auth/invite": "admin",
	// Uncomment and add your routes:
	// "/agentes": "agente",
	// "/comercial": "comercial",
	// "/dashboard": ["usuario", "agente", "comercial"], // Multiple roles
} as const;
```

## Testing Checklist

After applying database changes:

-   [ ] Verify all 9 existing users can still log in (2 admins + 7 migrated from 'user' to 'usuario')
-   [ ] Test admin role permissions and role management
-   [ ] Test creating new users with each new role (agente, comercial, invitado)
-   [ ] Verify role changes work in the admin panel (`/admin/roles`)
-   [ ] Test that desactivado users cannot access protected routes (handled in middleware)
-   [ ] Verify RLS policies work correctly for each role
-   [ ] Test middleware route protection for new roles
-   [ ] Verify the `prevent_role_escalation()` trigger prevents unauthorized role changes
-   [ ] Test invitation system still works for admins only

## Migration Order

1. **First**: Apply database constraint changes (Step 1) - Updates 7 users from 'user' to 'usuario'
2. **Second**: Update `prevent_role_escalation()` function (Step 2) - Adds validation for new roles
3. **Third**: (Optional) Update RLS policies if needed (Step 3)
4. **Fourth**: (Optional) Update invitations policy (Step 4)
5. **Fifth**: Test with existing users - Verify all 9 users work correctly
6. **Sixth**: Deploy code changes (already done)
7. **Seventh**: Configure middleware routes as needed for new roles

## Database Tables Summary

### profiles table

-   **Rows**: 9 (2 admin, 7 user → will become usuario)
-   **RLS Enabled**: Yes
-   **Triggers**: `check_role_escalation` (prevents non-admins from changing roles)
-   **Foreign Key**: `id` references `auth.users.id` (ON DELETE CASCADE)

### invitations table

-   **Rows**: 11
-   **RLS Enabled**: Yes
-   **Policy**: Only admins can manage invitations
-   **Foreign Key**: `invited_by` references `auth.users.id`

## Important Security Notes

1. **Role Escalation Protection**: The `prevent_role_escalation()` trigger ensures only admins can change roles
2. **RLS Policies**: Current policies use `is_admin()` helper function, which only checks for 'admin' role
3. **Middleware Protection**: The middleware (`utils/supabase/middleware.ts`) must be configured to block `desactivado` users
4. **Invitation System**: Only admins can create invitations (enforced via RLS policy)
5. **Default Role**: New users should default to 'usuario' role (configure in signup logic)

## Rollback Plan

If you need to rollback the database changes (within 1 hour of migration):

```sql
-- Revert to old role constraint
ALTER TABLE profiles
DROP CONSTRAINT profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'user'));

-- Revert prevent_role_escalation function to original version
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.role != NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized role change attempt. Only administrators can modify user roles.';
    END IF;

    RAISE NOTICE 'Role changed for user % from % to % by admin %',
      NEW.id, OLD.role, NEW.role, auth.uid();
  END IF;

  RETURN NEW;
END;
$function$;

-- Revert all new roles back to 'user' (affects 7 users)
UPDATE profiles
SET role = 'user', updated_at = now()
WHERE role IN ('usuario', 'agente', 'comercial', 'invitado', 'desactivado');
```

**Warning**: This rollback will fail if any users have been assigned to the new roles (agente, comercial, invitado, desactivado) after migration.
