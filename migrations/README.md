# Database Migrations Guide

## Safety-First Approach

**IMPORTANT:** Always test migrations on a development/staging environment before applying to production!

## Available Migrations

### 1. `create_letter_references_table.sql`
Creates table for tracking sequential letter numbers per executive.

### 2. `create_clients_schema.sql` (NEW)
Creates comprehensive client management schema with:
- Natural clients (humans) with tier-based requirements
- Juridic clients (companies)
- Legal representatives
- Policies management
- RLS security policies
- Helper functions

## How to Apply Migrations Safely

### Option 1: Using Supabase Dashboard (Recommended for Testing)

1. **Create a Development Branch First** (if using Supabase Branching):
   ```bash
   # In Supabase Dashboard: Database > Branching > Create Branch
   # Name it: "clients-schema-test"
   ```

2. **Open SQL Editor**:
   - Go to Supabase Dashboard
   - Navigate to: SQL Editor
   - Click "New Query"

3. **Copy Migration Content**:
   - Open `migrations/create_clients_schema.sql`
   - Copy all content
   - Paste into SQL Editor

4. **Review Before Running**:
   - Read through the SQL carefully
   - Verify table names don't conflict
   - Check RLS policies align with your security model

5. **Run Migration**:
   - Click "Run" button
   - Watch for any errors in output

6. **Verify Success**:
   ```sql
   -- Check tables were created
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('clients', 'natural_clients', 'juridic_clients', 'policies');

   -- Check indexes were created
   SELECT indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
   AND tablename LIKE '%clients%';
   ```

7. **Test with Sample Data**:
   ```sql
   -- Insert test natural client
   INSERT INTO clients (client_type, executive_in_charge, status)
   VALUES ('natural', 'Test Executive', 'active')
   RETURNING id;

   -- Use returned ID to insert natural client details
   INSERT INTO natural_clients (
       client_id,
       primer_nombre,
       primer_apellido,
       tipo_documento,
       numero_documento,
       nacionalidad,
       fecha_nacimiento,
       direccion
   ) VALUES (
       'YOUR_CLIENT_ID_HERE',
       'Juan',
       'Pérez',
       'CI',
       '1234567',
       'Boliviana',
       '1990-01-01',
       'Av. Test #123'
   );

   -- Verify data
   SELECT c.*, nc.*
   FROM clients c
   JOIN natural_clients nc ON c.id = nc.client_id;

   -- Clean up test data
   DELETE FROM clients WHERE executive_in_charge = 'Test Executive';
   ```

8. **If Everything Works**:
   - Merge branch to production (if using branching)
   - OR apply same migration to production database

### Option 2: Using Supabase CLI (Advanced)

```bash
# Initialize Supabase locally (if not done)
npx supabase init

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Create new migration from file
npx supabase db push

# OR run specific migration
psql "postgresql://..." < migrations/create_clients_schema.sql
```

## Rollback Plan

If something goes wrong, you can rollback by running:

```sql
-- Drop tables in reverse order (respects foreign keys)
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS legal_representatives CASCADE;
DROP TABLE IF EXISTS juridic_clients CASCADE;
DROP TABLE IF EXISTS natural_clients CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS get_client_active_premium(uuid);
DROP FUNCTION IF EXISTS get_client_active_policy_count(uuid);
DROP FUNCTION IF EXISTS get_required_tier_for_premium(decimal);
DROP FUNCTION IF EXISTS update_updated_at_column();
```

**Save this rollback script before applying migrations!**

## Post-Migration Checklist

- [ ] All tables created successfully
- [ ] Indexes created (check with `\di` in psql)
- [ ] RLS policies active (verify with sample queries)
- [ ] Triggers working (test update to see updated_at changes)
- [ ] Helper functions return expected results
- [ ] Sample data inserts/queries work correctly
- [ ] No conflicts with existing data

## Migration Contents Summary

### Tables Created:
1. **clients** - Base table for all clients
2. **natural_clients** - Human individuals with tier-based data
3. **juridic_clients** - Companies/organizations
4. **legal_representatives** - Legal reps for juridic clients
5. **policies** - Insurance policies

### Security:
- RLS enabled on all tables
- Policies for authenticated users
- Admin-only delete restrictions

### Performance:
- 15+ indexes for fast queries
- Optimized for common search patterns

### Helper Functions:
- `get_client_active_premium(client_id)` - Calculate total active premium
- `get_client_active_policy_count(client_id)` - Count active policies
- `get_required_tier_for_premium(amount)` - Determine data tier (1-3)

## Need Help?

If you encounter issues:
1. Check Supabase Dashboard > Database > Logs
2. Review error messages in SQL Editor
3. Verify no typos in client_id references
4. Ensure auth.users table exists (for foreign keys)

## Next Steps After Migration

1. Update TypeScript types to match new schema
2. Create API routes for CRUD operations
3. Update frontend to use real data instead of mocks
4. Test with production-like data volumes
5. Set up database backups/snapshots

---

**Remember: YOU control when this runs. Review thoroughly before applying!**
