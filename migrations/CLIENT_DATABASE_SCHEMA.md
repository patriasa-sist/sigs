# Client Database Schema Documentation

**Last Updated:** 2025-11-14 (RESTRUCTURED)
**Purpose:** Reference documentation for the client management database structure
**Migration File:** `update_client_schema_restructure.sql`

---

## Overview

The client database follows a polymorphic architecture with a base `clients` table that supports **three types of clients**:
- **Natural persons** (individuals) - stored in `natural_clients`
- **Juridic persons** (companies/organizations) - stored in `juridic_clients`
- **Unipersonal** (sole proprietorships) - personal data in `natural_clients` + commercial data in `unipersonal_clients`

## Table Architecture

### 1. clients (Base Table)
**Purpose:** Base table for all clients with common fields
**RLS Enabled:** Yes

#### Columns
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique client identifier |
| `client_type` | varchar | NOT NULL, CHECK | - | 'natural', 'juridica', or 'unipersonal' |
| `executive_in_charge` | text | NULLABLE | - | Assigned executive |
| `status` | varchar | CHECK | 'active' | 'active', 'inactive', or 'suspended' |
| `notes` | text | NULLABLE | - | General notes |
| `created_at` | timestamptz | NULLABLE | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update timestamp |
| `created_by` | uuid | NULLABLE, FK | - | References auth.users.id |

#### Constraints
- `client_type` must be 'natural', 'juridica', or 'unipersonal'
- `status` must be 'active', 'inactive', or 'suspended'

#### Foreign Keys (Referenced by)
- `policies.client_id` → `clients.id`
- `natural_clients.client_id` → `clients.id`
- `juridic_clients.client_id` → `clients.id`
- `unipersonal_clients.client_id` → `clients.id`
- `client_partners.client_id` → `clients.id`

---

### 2. natural_clients
**Purpose:** Extended data for natural persons (individuals)
**RLS Enabled:** Yes
**Note:** Also used for personal data of unipersonal clients

#### Form Sections
- **Sección 1:** Datos Personales
- **Sección 2:** Información de Contacto
- **Sección 3:** Otros Datos

#### Columns

##### Datos Personales (Required)
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `client_id` | uuid | PRIMARY KEY, FK | - | References clients.id |
| `primer_nombre` | varchar(100) | NOT NULL | - | First name (normalized, uppercase) |
| `segundo_nombre` | varchar(100) | NULLABLE | - | Second name (optional, normalized, uppercase) |
| `primer_apellido` | varchar(100) | NOT NULL | - | First surname (normalized, uppercase) |
| `segundo_apellido` | varchar(100) | NULLABLE | - | Second surname (optional, normalized, uppercase) |
| `tipo_documento` | varchar(50) | NOT NULL, CHECK | - | 'ci' or 'pasaporte' |
| `numero_documento` | varchar(50) | NOT NULL, CHECK | - | Min 6 characters, normalized, uppercase |
| `extension_ci` | varchar(5) | NULLABLE | - | CI extension (LP, CB, SC, OR, PT, TJ, CH, BE, PD) |
| `nacionalidad` | varchar(100) | NOT NULL | 'Boliviana' | Nationality (normalized, uppercase) |
| `fecha_nacimiento` | date | NOT NULL, CHECK | - | Birth date (1900-present) |
| `estado_civil` | varchar(50) | NOT NULL, CHECK | - | 'casado', 'soltero', 'divorciado', 'viudo' |

##### Información de Contacto (Required)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `direccion` | text | NOT NULL | Address (normalized, uppercase) |
| `correo_electronico` | varchar(255) | NOT NULL, CHECK | Email (normalized, validated) |
| `celular` | varchar(20) | NOT NULL, CHECK | Only numbers, min 5 digits |

##### Otros Datos (Optional)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `profesion_oficio` | varchar(200) | NULLABLE | Profession/trade (normalized, uppercase) |
| `actividad_economica` | varchar(200) | NULLABLE | Economic activity (normalized, uppercase) |
| `lugar_trabajo` | varchar(200) | NULLABLE | Workplace (normalized, uppercase) |
| `pais_residencia` | varchar(100) | NULLABLE | Country of residence (normalized, uppercase) |
| `genero` | varchar(20) | NULLABLE, CHECK | 'masculino', 'femenino', 'otro' |
| `nivel_ingresos` | numeric | NULLABLE | Income level: 2000 (bajo), 5000 (medio), 10000 (alto) |
| `cargo` | varchar(200) | NULLABLE | Position/title (normalized, uppercase) |
| `anio_ingreso` | date | NULLABLE | Entry date to workplace (DD-MM-YYYY) |
| `nit` | varchar(50) | NULLABLE, CHECK | Only numbers, min 7 digits |
| `domicilio_comercial` | text | NULLABLE | Business address (normalized, uppercase) |

#### Constraints
- `tipo_documento` must be 'ci' or 'pasaporte' (case insensitive)
- `numero_documento` minimum 6 characters
- `estado_civil` must be 'casado', 'soltero', 'divorciado', or 'viudo'
- `celular` regex: `^[0-9]{5,}$` (only numbers, min 5 digits)
- `correo_electronico` must match email format regex
- `genero` must be 'masculino', 'femenino', or 'otro' if provided
- `fecha_nacimiento` must be between 1900-01-01 and current date
- `nit` only numbers, min 7 digits if provided

#### Timestamps
- `created_at` (timestamptz, default: `now()`)
- `updated_at` (timestamptz, default: `now()`)

---

### 3. client_partners (NEW)
**Purpose:** Partner/spouse data for married natural clients
**RLS Enabled:** Yes
**Trigger:** Created when `natural_clients.estado_civil = 'casado'`

#### Columns
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY | Unique identifier |
| `client_id` | uuid | FK, UNIQUE | References clients.id (one partner per client) |
| `primer_nombre` | varchar(100) | NOT NULL | First name (normalized, uppercase) |
| `segundo_nombre` | varchar(100) | NULLABLE | Second name (optional) |
| `primer_apellido` | varchar(100) | NOT NULL | First surname (normalized, uppercase) |
| `segundo_apellido` | varchar(100) | NULLABLE | Second surname (optional) |
| `direccion` | text | NOT NULL | Address (normalized, uppercase) |
| `celular` | varchar(20) | NOT NULL, CHECK | Only numbers, min 5 digits |
| `correo_electronico` | varchar(255) | NOT NULL, CHECK | Email (normalized, validated) |
| `profesion_oficio` | varchar(200) | NOT NULL | Profession/trade (normalized, uppercase) |
| `actividad_economica` | varchar(200) | NOT NULL | Economic activity (normalized, uppercase) |
| `lugar_trabajo` | varchar(200) | NOT NULL | Workplace (normalized, uppercase) |
| `created_at` | timestamptz | - | Creation timestamp |
| `updated_at` | timestamptz | - | Last update timestamp |

#### Constraints
- `client_id` UNIQUE (one partner per client)
- `correo_electronico` must match email format regex
- `celular` regex: `^[0-9]{5,}$`

---

### 4. unipersonal_clients (NEW)
**Purpose:** Commercial data for unipersonal (sole proprietorship) clients
**RLS Enabled:** Yes
**Note:** Requires corresponding entry in both `clients` and `natural_clients` tables

#### Form Sections
- **Sección 4:** Datos Comerciales
- **Sección 5:** Datos del Propietario
- **Sección 6:** Representante Legal

#### Columns

##### Datos Comerciales
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `client_id` | uuid | PRIMARY KEY, FK | References clients.id |
| `razon_social` | varchar(255) | NOT NULL | Business legal name (normalized, uppercase) |
| `nit` | varchar(50) | NOT NULL, UNIQUE, CHECK | Only numbers, min 7 digits |
| `matricula_comercio` | varchar(100) | NULLABLE, CHECK | Commercial registry (min 7 chars) |
| `domicilio_comercial` | text | NOT NULL | Business address (normalized, uppercase) |
| `telefono_comercial` | varchar(20) | NOT NULL, CHECK | Only numbers, min 5 digits |
| `actividad_economica_comercial` | varchar(200) | NOT NULL | Commercial activity (normalized, uppercase) |
| `nivel_ingresos` | numeric | NOT NULL | Income level: 2000, 5000, or 10000 |
| `correo_electronico_comercial` | varchar(255) | NOT NULL, CHECK | Commercial email (normalized, validated) |

##### Datos del Propietario
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `nombre_propietario` | varchar(200) | NOT NULL | Owner full name (normalized, uppercase) |
| `apellido_propietario` | varchar(200) | NOT NULL | Owner surname (normalized, uppercase) |
| `documento_propietario` | varchar(50) | NOT NULL, CHECK | Owner document (min 7 digits) |
| `extension_propietario` | varchar(5) | NULLABLE | Document extension |
| `nacionalidad_propietario` | varchar(100) | NOT NULL | Owner nationality (normalized, uppercase) |

##### Representante Legal
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `nombre_representante` | varchar(200) | NOT NULL | Representative full name (normalized, uppercase) |
| `ci_representante` | varchar(50) | NOT NULL, CHECK | Representative CI (min 7 digits) |
| `extension_representante` | varchar(5) | NULLABLE | CI extension |

#### Constraints
- `nit` must be unique, only numbers, min 7 digits
- `matricula_comercio` min 7 characters if provided
- `correo_electronico_comercial` must match email format regex
- `telefono_comercial` regex: `^[0-9]{5,}$`
- `documento_propietario` min 7 digits
- `ci_representante` min 7 digits
- `nivel_ingresos` must be > 0

#### Timestamps
- `created_at` (timestamptz, default: `now()`)
- `updated_at` (timestamptz, default: `now()`)

---

### 5. juridic_clients
**Purpose:** Extended data for juridic persons (companies/organizations)
**RLS Enabled:** Yes

#### Form Sections
- **Sección 1:** Datos de la Empresa
- **Sección 2:** Información de Contacto
- **Sección 3:** Representantes Legales

#### Columns

##### Datos de la Empresa
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `client_id` | uuid | PRIMARY KEY, FK | - | References clients.id |
| `razon_social` | varchar(255) | NOT NULL | - | Company legal name (normalized, uppercase) |
| `tipo_sociedad` | varchar(100) | NULLABLE, CHECK | - | Company type (see constraint below) |
| `tipo_documento` | varchar(50) | NOT NULL | 'NIT' | Always 'NIT' |
| `nit` | varchar(50) | NOT NULL, UNIQUE, CHECK | - | Only numbers, min 7 digits |
| `matricula_comercio` | varchar(100) | NULLABLE, CHECK | - | Commercial registry (min 7 chars) |
| `pais_constitucion` | varchar(100) | NOT NULL | 'Bolivia' | Country of incorporation (normalized, uppercase) |
| `actividad_economica` | varchar(200) | NOT NULL | - | Economic activity (normalized, uppercase) |

##### Información de Contacto
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `direccion_legal` | text | NOT NULL | Legal address (normalized, uppercase) |
| `correo_electronico` | varchar(255) | NULLABLE, CHECK | Email (normalized, validated) |
| `telefono` | varchar(20) | NULLABLE, CHECK | Only numbers, min 5 digits |

#### Constraints
- `tipo_sociedad` must be one of: SRL, SCO, SCS, SA, SCA, AAP, SEM, LIM, EPB, UNI, MIC, FUN, SCI, IED, ORR
- `nit` must be unique, only numbers, min 7 digits
- `matricula_comercio` min 7 characters if provided
- `telefono` regex: `^[0-9]{5,}$` if provided
- `correo_electronico` must match email format regex if provided

#### Foreign Keys (Referenced by)
- `legal_representatives.juridic_client_id` → `juridic_clients.client_id`

#### Timestamps
- `created_at` (timestamptz, default: `now()`)
- `updated_at` (timestamptz, default: `now()`)

---

### 6. legal_representatives
**Purpose:** Legal representatives for juridic clients
**RLS Enabled:** Yes
**Note:** At least one representative required per juridic client

#### Columns
| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| `id` | uuid | PRIMARY KEY | `gen_random_uuid()` | Unique identifier |
| `juridic_client_id` | uuid | FK, NOT NULL | - | References juridic_clients.client_id |
| `primer_nombre` | varchar(100) | NOT NULL | - | First name (normalized, uppercase) |
| `segundo_nombre` | varchar(100) | NULLABLE | - | Second name (optional, normalized, uppercase) |
| `primer_apellido` | varchar(100) | NOT NULL | - | First surname (normalized, uppercase) |
| `segundo_apellido` | varchar(100) | NULLABLE | - | Second surname (optional) |
| `tipo_documento` | varchar(50) | NOT NULL, CHECK | - | 'ci' or 'pasaporte' |
| `numero_documento` | varchar(50) | NOT NULL, CHECK | - | Min 6 characters, normalized, uppercase |
| `extension` | varchar(5) | NULLABLE | - | Document extension |
| `is_primary` | boolean | NULLABLE | true | Primary representative flag |
| `cargo` | varchar(200) | NULLABLE | - | Position/title (normalized, uppercase) |
| `telefono` | varchar(20) | NULLABLE | - | Phone number |
| `correo_electronico` | varchar(255) | NULLABLE, CHECK | - | Email (validated format) |
| `created_at` | timestamptz | NULLABLE | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NULLABLE | `now()` | Last update timestamp |

#### Legacy Column
| Column | Status | Description |
|--------|--------|-------------|
| `nombre` | DEPRECATED | Use `primer_nombre` and `segundo_nombre` instead |

#### Constraints
- `tipo_documento` must be 'ci' or 'pasaporte' (case insensitive)
- `numero_documento` minimum 6 characters
- `correo_electronico` must match email format regex if provided
- Each juridic client can have multiple representatives
- One representative should be marked as `is_primary = true`

#### Timestamps
- `created_at` (timestamptz, default: `now()`)
- `updated_at` (timestamptz, default: `now()`)

---

### 7. policies
**Purpose:** Insurance policies linked to clients
**RLS Enabled:** Yes
**(No changes from original schema)**

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
    │       ↓
    │   client_partners (1:1, optional, when estado_civil='casado')
    │
    ├─→ unipersonal_clients (1:1, client_type='unipersonal')
    │   + natural_clients (requires both)
    │
    ├─→ juridic_clients (1:1, client_type='juridica')
    │       ↓
    │   legal_representatives (1:N, min 1 required)
    │
    └─→ policies (1:N)
```

---

## Data Normalization Rules

All text fields must be normalized before storage:
- **Uppercase:** All text fields (names, addresses, etc.)
- **Trim:** Remove leading/trailing whitespace
- **Phone numbers:** Only numeric digits allowed
- **Emails:** Lowercase, validated format
- **Document numbers:** Uppercase, trimmed, special chars removed

### Helper Functions
- `normalize_text(text)` - Uppercase and trim
- `clean_phone(varchar)` - Extract only digits

---

## Views for Easy Querying

### v_natural_clients_complete
Complete natural client data including optional partner information.

### v_unipersonal_clients_complete
Complete unipersonal client data with both personal and commercial fields.

### v_juridic_clients_complete
Complete juridic client data with aggregated legal representatives as JSON array.

---

## Supporting Tables

### tipos_seguros
**Purpose:** Insurance type catalog
**Rows:** 42
**RLS Enabled:** Yes
**(No changes from original schema)**

#### Columns
- `id` (integer, PK)
- `codigo` (varchar, unique)
- `nombre` (varchar)
- `es_ramo_padre` (boolean, default: false)
- `ramo_padre_id` (integer, FK to tipos_seguros.id)
- `activo` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

---

## Row-Level Security (RLS)

All tables have RLS enabled. Policies allow:
- **SELECT:** All authenticated users
- **INSERT/UPDATE:** All authenticated users
- **DELETE:** Admin users only (on clients table)

---

## Migration Files Reference

- `create_clients_schema.sql` - Initial client schema (original)
- `update_client_schema_restructure.sql` - **Current migration** (2025-11-14)
- `create_letter_references_table.sql` - Letter reference system

---

## Quick Reference: Required Fields by Client Type

### Natural Client (Minimum)
**Datos Personales:**
- primer_nombre, primer_apellido
- tipo_documento (ci/pasaporte), numero_documento (min 6 chars)
- nacionalidad, fecha_nacimiento
- estado_civil (casado/soltero/divorciado/viudo)

**Contacto:**
- direccion
- correo_electronico (validated)
- celular (only numbers, min 5 digits)

**Partner (if estado_civil='casado'):**
- All partner fields required

### Unipersonal Client
**All Natural Client fields +**
- razon_social, nit (min 7 digits)
- domicilio_comercial, telefono_comercial
- actividad_economica_comercial, nivel_ingresos
- correo_electronico_comercial
- nombre_propietario, apellido_propietario, documento_propietario, nacionalidad_propietario
- nombre_representante, ci_representante

### Juridic Client
**Empresa:**
- razon_social, nit (min 7 digits)
- pais_constitucion, actividad_economica
- direccion_legal

**Representante Legal (min 1):**
- primer_nombre, primer_apellido
- tipo_documento, numero_documento (min 6 chars)

---

## Important Notes

1. **Tier System Removed:** Natural clients no longer have tier-based requirements. All contact fields are now required.
2. **Unipersonal Architecture:** Uses parallel table structure (both natural_clients + unipersonal_clients)
3. **Partner Support:** New table for spouse/partner data when married
4. **Normalization:** All text fields must be uppercase and trimmed
5. **Phone Validation:** Only numeric digits, minimum 5 digits
6. **Document Validation:**
   - Natural persons: min 6 characters
   - NIT/business: min 7 digits
   - Only 'ci' or 'pasaporte' allowed
7. **"Same As" Functionality:** Implemented in UI, copies values between fields (domicilio_comercial, unipersonal owner/representative fields)
8. **Income Levels:** Stored as numeric (2000, 5000, 10000), shown as dropdown in UI
9. **Date Fields:** anio_ingreso changed from integer to full date

---

## Production Migration Checklist

Before running `update_client_schema_restructure.sql`:
- [ ] Back up all client data
- [ ] Verify existing natural_clients have correo_electronico and celular values
- [ ] Review nivel_ingresos varchar to numeric conversion
- [ ] Review anio_ingreso integer to date conversion
- [ ] Test legal_representatives nombre field split
- [ ] Update application code for field renames (oficio → profesion_oficio)
- [ ] Update application code for new unipersonal client type
- [ ] Update forms to collect partner data when estado_civil='casado'
- [ ] Test all validation constraints with real data
- [ ] Update API endpoints and form submission handlers

---

**End of Documentation**
