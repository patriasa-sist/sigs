# Client Database Schema Documentation

**Last Updated:** 2025-11-14
**Purpose:** Reference documentation for the client management database structure

---

## Overview

The client database follows a polymorphic architecture with a base `clients` table that supports two types of clients:
- **Natural persons** (individuals) - stored in `natural_clients`
- **Juridic persons** (companies/organizations) - stored in `juridic_clients`

## Table Architecture

### 1. clients (Base Table)
**Purpose:** Base table for all clients with common fields
**Rows:** 1
**RLS Enabled:** Yes

#### Columns
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique client identifier |
| `client_type` | varchar | NOT NULL, CHECK | - | 'natural' or 'juridica' |
| `executive_in_charge` | text | NULLABLE | - | Assigned executive |
| `status` | varchar | CHECK | 'active' | 'active', 'inactive', or 'suspended' |
| `notes` | text | NULLABLE | - | General notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update timestamp |
| `created_by` | uuid | NULLABLE, FK | - | References auth.users.id |

#### Constraints
- `client_type` must be either 'natural' or 'juridica'
- `status` must be 'active', 'inactive', or 'suspended'

#### Foreign Keys (Referenced by)
- `policies.client_id` → `clients.id`
- `natural_clients.client_id` → `clients.id`
- `juridic_clients.client_id` → `clients.id`

---

### 2. natural_clients
**Purpose:** Extended data for natural persons (individuals)
**Rows:** 1
**RLS Enabled:** Yes

#### Tier-Based Data Requirements
- **Tier 1 (Base):** All required fields below
- **Tier 2 ($1,001+):** Requires `celular` field
- **Tier 3 ($5,001+):** Requires `correo_electronico` field

#### Columns

##### Required Fields
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `client_id` | uuid | PRIMARY KEY, FK | - | References clients.id |
| `primer_nombre` | varchar | NOT NULL | - | First name |
| `primer_apellido` | varchar | NOT NULL | - | First surname |
| `tipo_documento` | varchar | NOT NULL | - | Document type |
| `numero_documento` | varchar | NOT NULL | - | Document number |
| `nacionalidad` | varchar | NOT NULL | 'Boliviana' | Nationality |
| `fecha_nacimiento` | date | NOT NULL, CHECK | - | Birth date (1900-present) |
| `direccion` | text | NOT NULL | - | Address |

##### Optional Personal Information
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `segundo_nombre` | varchar | NULLABLE | Second name |
| `segundo_apellido` | varchar | NULLABLE | Second surname |
| `extension_ci` | varchar | NULLABLE | ID card extension |
| `estado_civil` | varchar | NULLABLE | Civil status |
| `genero` | varchar | NULLABLE, CHECK | 'Masculino', 'Femenino', 'Otro' |

##### Contact Information
| Column | Type | Tier | Description |
|--------|------|------|-------------|
| `celular` | varchar | Tier 2+ | Mobile phone |
| `correo_electronico` | varchar | Tier 3+ | Email (validated format) |
| `pais_residencia` | varchar | - | Country of residence (default: 'Bolivia') |

##### Professional/Economic Information
| Column | Type | Description |
|--------|------|-------------|
| `oficio` | varchar | Profession/trade |
| `actividad_economica` | varchar | Economic activity |
| `lugar_trabajo` | varchar | Workplace |
| `cargo` | varchar | Position/title |
| `anio_ingreso` | integer | Year of entry |
| `nivel_ingresos` | varchar | Income level |
| `nit` | varchar | Tax identification number |
| `domicilio_comercial` | text | Business address |

#### Constraints
- `fecha_nacimiento` must be between 1900-01-01 and current date
- `correo_electronico` must match email format regex if provided
- `genero` must be 'Masculino', 'Femenino', or 'Otro' if provided

#### Timestamps
- `created_at` (timestamptz, default: `now()`)
- `updated_at` (timestamptz, default: `now()`)

---

### 3. juridic_clients
**Purpose:** Extended data for juridic persons (companies/organizations)
**Rows:** 0
**RLS Enabled:** Yes

#### Columns

##### Required Fields
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `client_id` | uuid | PRIMARY KEY, FK | - | References clients.id |
| `razon_social` | varchar | NOT NULL | - | Company legal name |
| `tipo_documento` | varchar | NOT NULL | 'NIT' | Document type |
| `nit` | varchar | NOT NULL, UNIQUE | - | Tax identification number |
| `pais_constitucion` | varchar | NOT NULL | 'Bolivia' | Country of incorporation |
| `direccion_legal` | text | NOT NULL | - | Legal address |
| `actividad_economica` | varchar | NOT NULL | - | Economic activity |

##### Optional Fields
| Column | Type | Description |
|--------|------|-------------|
| `tipo_sociedad` | varchar | Type of company (S.A., S.R.L., etc.) |
| `matricula_comercio` | varchar | Commercial registry number |
| `correo_electronico` | varchar | Email (validated format) |
| `telefono` | varchar | Phone number |

#### Constraints
- `nit` must be unique across all juridic clients
- `correo_electronico` must match email format regex if provided

#### Foreign Keys (Referenced by)
- `legal_representatives.juridic_client_id` → `juridic_clients.client_id`

#### Timestamps
- `created_at` (timestamptz, default: `now()`)
- `updated_at` (timestamptz, default: `now()`)

---

### 4. legal_representatives
**Purpose:** Legal representatives for juridic clients
**Rows:** 0
**RLS Enabled:** Yes

#### Columns
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `juridic_client_id` | uuid | FK, NOT NULL | - | References juridic_clients.client_id |
| `nombre` | varchar | NOT NULL | - | First name |
| `primer_apellido` | varchar | NOT NULL | - | First surname |
| `segundo_apellido` | varchar | NULLABLE | - | Second surname |
| `tipo_documento` | varchar | NOT NULL | - | Document type |
| `numero_documento` | varchar | NOT NULL | - | Document number |
| `extension` | varchar | NULLABLE | - | ID extension |
| `is_primary` | boolean | NULLABLE | true | Primary representative flag |
| `cargo` | varchar | NULLABLE | - | Position/title |
| `telefono` | varchar | NULLABLE | - | Phone number |
| `correo_electronico` | varchar | NULLABLE, CHECK | - | Email (validated format) |
| `created_at` | timestamptz | NULLABLE | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update timestamp |

#### Constraints
- `correo_electronico` must match email format regex if provided
- Each juridic client can have multiple representatives
- One representative should be marked as `is_primary = true`

---

### 5. policies
**Purpose:** Insurance policies linked to clients
**Rows:** 0
**RLS Enabled:** Yes

#### Columns
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique policy identifier |
| `client_id` | uuid | FK, NOT NULL | - | References clients.id |
| `policy_number` | varchar | NOT NULL, UNIQUE | - | Policy number |
| `insurance_type` | varchar | NOT NULL, CHECK | - | Type of insurance |
| `status` | varchar | NOT NULL, CHECK | 'vigente' | Policy status |
| `start_date` | date | NOT NULL | - | Policy start date |
| `expiration_date` | date | NOT NULL | - | Policy expiration date |
| `premium_usd` | numeric | NOT NULL, CHECK | - | Premium amount in USD |
| `beneficiary_name` | varchar | NULLABLE | - | Beneficiary name |
| `coverage_details` | text | NULLABLE | - | Coverage details |
| `notes` | text | NULLABLE | - | Additional notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update timestamp |

#### Constraints
- `insurance_type` must be: 'salud', 'automotor', 'vida', or 'general'
- `status` must be: 'vigente', 'vencida', 'cancelada', or 'pendiente'
- `premium_usd` must be >= 0
- `policy_number` must be unique across all policies

---

## Relationships Diagram

```
auth.users
    ↓ (created_by)
clients (base table)
    ├─→ natural_clients (1:1, client_type='natural')
    ├─→ juridic_clients (1:1, client_type='juridica')
    │       ↓
    │   legal_representatives (1:N)
    └─→ policies (1:N)
```

---

## Supporting Tables

### tipos_seguros
**Purpose:** Insurance type catalog
**Rows:** 42
**RLS Enabled:** Yes

#### Columns
- `id` (integer, PK)
- `codigo` (varchar, unique)
- `nombre` (varchar)
- `es_ramo_padre` (boolean, default: false)
- `ramo_padre_id` (integer, FK to tipos_seguros.id)
- `activo` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

---

## Data Validation Rules

### Email Format
```regex
^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$
```

### Date Constraints
- `fecha_nacimiento`: Must be between 1900-01-01 and current date
- `expiration_date`: No explicit constraint but should be after `start_date`

### Numeric Constraints
- `premium_usd`: Must be >= 0
- `anio_ingreso`: Integer, no explicit range

---

## Row-Level Security (RLS)

All tables have RLS enabled. Specific policies should be reviewed in the Supabase dashboard.

---

## Migration Files Reference

Related migration files in `/migrations/`:
- `create_clients_schema.sql` - Initial client schema creation
- `create_letter_references_table.sql` - Letter reference system

---

## Notes

1. **Polymorphic Design**: The `clients` table acts as a parent with `client_type` discriminator
2. **Tier-Based Requirements**: Natural clients have progressive data requirements based on transaction amounts
3. **Audit Trail**: All tables include `created_at` and `updated_at` timestamps
4. **Data Integrity**: Extensive CHECK constraints and foreign keys maintain data quality
5. **Future Considerations**:
   - Consider adding indexes on frequently queried fields
   - May need to add soft delete functionality
   - Consider adding client history/audit log table

---

## Quick Reference: Required Fields by Client Type

### Natural Client (Minimum)
- primer_nombre, primer_apellido
- tipo_documento, numero_documento
- nacionalidad, fecha_nacimiento
- direccion

### Juridic Client (Minimum)
- razon_social
- nit
- pais_constitucion
- direccion_legal
- actividad_economica

### Policy (All Required)
- client_id, policy_number
- insurance_type, status
- start_date, expiration_date
- premium_usd
