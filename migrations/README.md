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

### Immediate (After Schema is Applied):
1. **Update TypeScript types** to match new database schema
2. **Create Supabase API routes** for CRUD operations
   - Client creation (natural and juridic)
   - Client search/listing
   - Policy linking
   - Legal representative management
3. **Update frontend** to use real Supabase data instead of mocks
4. **Test with production-like data volumes**
5. **Set up database backups/snapshots** in Supabase Dashboard

### Phase 2: Policy-Specific Data Tables (IMPORTANT!)
Create separate tables for policy-type-specific data:

#### Automotive Policies (`automotive_policy_details`):
```sql
CREATE TABLE automotive_policy_details (
    policy_id uuid PRIMARY KEY REFERENCES policies(id) ON DELETE CASCADE,
    vehiculo_matricula varchar(20) NOT NULL,
    vehiculo_marca varchar(100),
    vehiculo_modelo varchar(100),
    vehiculo_anio integer,
    vehiculo_color varchar(50),
    numero_chasis varchar(100),
    numero_motor varchar(100),
    -- Images/documents
    foto_frontal_url text,
    foto_lateral_url text,
    foto_trasera_url text,
    cedula_identidad_url text,
    created_at timestamptz DEFAULT now()
);
```

#### Health Policies (`health_policy_details`):
```sql
CREATE TABLE health_policy_details (
    policy_id uuid PRIMARY KEY REFERENCES policies(id) ON DELETE CASCADE,
    beneficiarios jsonb, -- Array of beneficiary objects
    foto_cliente_url text, -- Client photo
    historial_medico_url text, -- Medical history document
    tipo_cobertura varchar(100),
    hospital_preferido varchar(200),
    created_at timestamptz DEFAULT now()
);
```

#### General/Life Policies (`general_policy_details`):
```sql
CREATE TABLE general_policy_details (
    policy_id uuid PRIMARY KEY REFERENCES policies(id) ON DELETE CASCADE,
    tipo_riesgo varchar(100),
    suma_asegurada decimal(12, 2),
    documentos_adicionales jsonb, -- Array of document URLs
    created_at timestamptz DEFAULT now()
);
```

### Phase 3: Data Migration & Integration
1. **Migrate existing mock data** to real database
2. **Create validation functions** for tier-based requirements
   ```sql
   -- Example: Function to validate natural client has required fields for tier
   CREATE FUNCTION validate_natural_client_tier(client_id uuid)
   RETURNS boolean AS $$...$$;
   ```
3. **Add client tier management**:
   - Automatic tier calculation based on total premium
   - Warning system when tier requirements not met
4. **Implement file upload system** for policy documents/images
   - Use Supabase Storage buckets
   - Link to policy details tables

### Phase 4: Advanced Features
1. **Client dashboard** showing:
   - Total premium across all policies
   - Required tier vs current tier
   - Missing data warnings
2. **Compliance reporting**:
   - Generate lists of clients missing required data
   - Export for regulatory compliance
3. **Search optimization**:
   - Full-text search across all client data
   - Policy-specific searches (e.g., search by matricula)
4. **Audit trail**:
   - Track all changes to client/policy data
   - Who made changes and when

### Phase 5: Production Readiness
1. **Performance testing** with 10,000+ clients
2. **Backup strategy**:
   - Daily automated backups
   - Point-in-time recovery enabled
3. **Monitoring**:
   - Set up alerts for failed queries
   - Track slow queries
4. **Documentation**:
   - API documentation
   - User manual for data entry
   - Compliance checklist

---

## Important Design Notes

### Why Vehicle Data Was Removed from Clients:
- **Normalization**: A client can have multiple vehicles (multiple automotive policies)
- **Flexibility**: Different policies need different data (health needs beneficiaries, automotive needs vehicle info)
- **Compliance**: Policy-specific data requirements are tied to the policy, not the client
- **Searchability**: Can still search by matricula through policy joins

### Data Architecture Best Practices:
1. **Client table** = Who is the client (person/company)
2. **Policy table** = What insurance coverage they have
3. **Policy details tables** = Type-specific requirements (vehicle, beneficiaries, etc.)

This separation ensures:
- ✅ No duplicate data
- ✅ Clear data ownership
- ✅ Easy to add new policy types
- ✅ Compliance with data minimization principles

---

**Remember: YOU control when this runs. Review thoroughly before applying!**
