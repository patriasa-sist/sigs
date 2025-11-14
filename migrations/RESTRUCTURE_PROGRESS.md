# Client Form Restructure - Progress Report

**Date Started:** 2025-11-14
**Status:** In Progress (60% Complete)

---

## Completed Tasks ✅

### 1. Database Migration SQL File
**File:** `migrations/update_client_schema_restructure.sql`
- ✅ Added 'unipersonal' to client_type enum
- ✅ Updated natural_clients table with new field requirements
- ✅ Created client_partners table for spouse/partner data
- ✅ Created unipersonal_clients table for sole proprietorships
- ✅ Updated juridic_clients table with tipo_sociedad and validation
- ✅ Updated legal_representatives table structure
- ✅ Created helper views for easier querying
- ✅ Added normalization helper functions (normalize_text, clean_phone)

**Action Required:** Execute this migration on the database after backing up existing data

### 2. Schema Documentation
**File:** `migrations/CLIENT_DATABASE_SCHEMA.md`
- ✅ Comprehensive documentation of all tables
- ✅ Field-by-field descriptions with validation rules
- ✅ Relationship diagrams
- ✅ Quick reference guides
- ✅ Production migration checklist

### 3. Normalization Utilities
**File:** `utils/formNormalization.ts`
- ✅ normalizeText() - Uppercase and trim
- ✅ normalizeEmail() - Lowercase and trim
- ✅ cleanPhone() - Extract only digits
- ✅ normalizeDocument() - Clean document numbers
- ✅ validateEmail(), validateNIT(), validateMinDigits()
- ✅ mapIncomeLevelToValue() and reverse mapping
- ✅ Specialized normalizers for each client type
- ✅ Date formatting utilities (DD-MM-YYYY)

### 4. Type Definitions
**File:** `types/clientForm.ts`
- ✅ Updated to support 3 client types (natural, unipersonal, juridica)
- ✅ Section-based interfaces (personal, contact, other data)
- ✅ ClientPartnerData interface for spouse data
- ✅ UnipersonalClientFormData with commercial/owner/representative fields
- ✅ Updated JuridicClientFormData with new fields
- ✅ Split LegalRepresentativeData (primer_nombre, segundo_nombre, etc.)
- ✅ Zod validation schemas for all forms
- ✅ SameAsState interface for checkbox logic
- ✅ Database payload types for submission

### 5. SameAsCheckbox Component
**File:** `components/ui/same-as-checkbox.tsx`
- ✅ Reusable checkbox component
- ✅ Auto-copies values from source to target field
- ✅ Disables target field when checked
- ✅ Syncs values when source changes
- ✅ Full TypeScript support with documentation

### 6. ClientTypeSelector Component
**File:** `components/clientes/ClientTypeSelector.tsx`
- ✅ Updated to show 3 options (Natural, Unipersonal, Jurídica)
- ✅ Added Briefcase icon for Unipersonal
- ✅ Updated grid layout (3 columns on desktop)
- ✅ Fixed type name from "juridico" to "juridica"

---

## Remaining Tasks 🚧

### 7. Restructure NaturalClientForm
**File:** `components/clientes/NaturalClientForm.tsx`
**Estimated Effort:** High

**Changes Needed:**
- Remove tier-based sections (Tier 1, 2, 3)
- Implement new 4-section layout:
  - **Sección 1:** Datos Personales (primer_nombre, apellidos, documento, nacionalidad, fecha_nacimiento, estado_civil)
  - **Sección 2:** Información de Contacto (direccion, correo_electronico, celular)
  - **Sección 3:** Otros Datos (profesion_oficio, actividad_economica, etc.)
  - **Sección 4:** Datos del Cónyuge (conditional, if estado_civil = 'casado')
- Update all field names (oficio → profesion_oficio)
- Add nivel_ingresos dropdown (bajo/medio/alto → 2000/5000/10000)
- Add "same as direccion" checkbox for domicilio_comercial
- Update validation rules
- Apply normalization on blur/submit

### 8. Create UnipersonalClientForm
**File:** `components/clientes/UnipersonalClientForm.tsx` (NEW)
**Estimated Effort:** Very High

**Structure Needed:**
- **Sections 1-3:** Same as Natural Client (inherits personal data)
- **Sección 4:** Datos Comerciales
  - razon_social, nit, matricula_comercio
  - domicilio_comercial (with "same as direccion" checkbox)
  - telefono_comercial, actividad_economica_comercial
  - nivel_ingresos dropdown, correo_electronico_comercial (with "same as" checkbox)
- **Sección 5:** Datos del Propietario
  - nombre_propietario (with "same as nombres" checkbox)
  - apellido_propietario (with "same as apellidos" checkbox)
  - documento_propietario (with "same as documento" checkbox)
  - extension_propietario, nacionalidad_propietario
- **Sección 6:** Representante Legal
  - nombre_representante (with "same as propietario" checkbox)
  - ci_representante, extension_representante
- Use SameAsCheckbox component throughout
- Apply all normalization rules

### 9. Restructure JuridicClientForm
**File:** `components/clientes/JuridicClientForm.tsx`
**Estimated Effort:** Medium

**Changes Needed:**
- Implement new 3-section layout:
  - **Sección 1:** Datos de la Empresa
  - **Sección 2:** Información de Contacto
  - **Sección 3:** Representantes Legales
- Add tipo_sociedad dropdown (SRL, SCO, SCS, SA, etc.)
- Add matricula_comercio field
- Update legal representatives to use split name fields (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido)
- Update validation rules (NIT min 7 digits, etc.)
- Apply normalization

### 10. Update Form Submission Handlers
**File:** `app/clientes/nuevo/page.tsx` or similar
**Estimated Effort:** Medium

**Changes Needed:**
- Apply normalization before submission
- Handle unipersonal client creation (3-table insert: clients, natural_clients, unipersonal_clients)
- Handle partner creation when estado_civil = 'casado'
- Update Supabase insert queries for new schema
- Add error handling for multi-table inserts
- Test all 3 client type submissions

---

## Database Schema Changes Summary

### New Tables
1. **client_partners** - Partner/spouse data (when estado_civil = 'casado')
2. **unipersonal_clients** - Commercial data for sole proprietorships

### Modified Tables
1. **clients** - Added 'unipersonal' to client_type enum
2. **natural_clients** - Simplified fields, made email/phone required, changed data types
3. **juridic_clients** - Added tipo_sociedad enum, matricula_comercio validation
4. **legal_representatives** - Split nombre field into primer_nombre/segundo_nombre

### Key Validation Changes
- Document types: Only 'ci' and 'pasaporte' (removed 'Otro')
- Estado civil: Only 'casado', 'soltero', 'divorciado', 'viudo'
- Phone numbers: Only digits, min 5 characters
- NITs: Only digits, min 7 characters
- Document numbers: Min 6 characters (natural), min 7 (business)
- All text fields: Uppercase, trimmed

---

## Form Field Mapping Changes

### Renamed Fields
| Old Name | New Name |
|----------|----------|
| `oficio` | `profesion_oficio` |
| `email` | `correo_electronico` |
| `telefono` | `celular` (natural) |
| `nombre` (legal rep) | `primer_nombre` + `segundo_nombre` |

### Changed Data Types
| Field | Old Type | New Type |
|-------|----------|----------|
| `nivel_ingresos` | varchar | numeric (2000, 5000, 10000) |
| `anio_ingreso` | integer (year) | date (full date) |

### New Required Fields (Natural Client)
- `correo_electronico` (was tier 3, now required for all)
- `celular` (was tier 2, now required for all)
- `estado_civil` (was optional, now required)

---

## Testing Checklist

Before deploying to production:
- [ ] Run migration SQL on test database
- [ ] Test natural client creation with all 3 sections
- [ ] Test natural client with partner (when casado)
- [ ] Test unipersonal client creation
- [ ] Test juridic client creation with multiple representatives
- [ ] Verify normalization is applied correctly
- [ ] Verify "same as" checkboxes work properly
- [ ] Test validation rules (min lengths, regex, etc.)
- [ ] Test nivel_ingresos dropdown mapping
- [ ] Test date formatting (DD-MM-YYYY)
- [ ] Verify database constraints are enforced
- [ ] Test form auto-save/restore functionality
- [ ] Check responsive design on mobile/tablet
- [ ] Verify all error messages display correctly

---

## Next Steps

1. **Complete remaining form components** (Tasks 7-9)
2. **Update form submission logic** (Task 10)
3. **Run database migration** on staging environment
4. **Perform thorough testing** using checklist above
5. **Update API endpoints** if needed
6. **Deploy to production** after approval

---

## Notes

- All normalization functions are ready to use
- SameAsCheckbox component is fully functional
- Type definitions provide full TypeScript safety
- Database migration includes rollback considerations
- Views created for easier data querying
- Documentation is comprehensive and up-to-date

---

**Last Updated:** 2025-11-14
**Completed by:** Claude Code
