# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## Project Architecture

### Technology Stack
- **Framework**: Next.js 15.4.6 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Authentication**: Supabase Auth with SSR
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Forms**: React Hook Form with Zod validation
- **Analytics**: Vercel Analytics and Speed Insights
- **PDF Generation**: @react-pdf/renderer for dynamic document creation
- **File Processing**: ExcelJS for Excel file parsing and validation
- **File Management**: JSZip for bulk downloads, react-dropzone for uploads

### Application Structure
- **App Directory**: Uses Next.js App Router structure
- **Authentication Flow**: Invitation-only system with role-based access control
- **Middleware**: Handles authentication state and role-based route protection
- **Components**: 
  - Reusable UI components in `/components/ui/`
  - Module-specific components in `/components/{module}/`
  - Global navbar with conditional rendering based on routes
- **Utils**: Supabase client configurations and specialized utilities
- **Types**: Comprehensive TypeScript definitions for business logic

### Key Features
- **Role-based Access**: Admin and user roles with route protection
- **Invitation System**: Users must have valid invitations to sign up
- **Database Tables**: 
  - `profiles` - User profiles with role field
  - `invitations` - Email invitations with tokens and expiration
- **Protected Routes**:
  - `/admin` - Admin role required
  - `/auth/invite` - Admin role required
- **Public Routes**: Login, signup, error, confirm, unauthorized pages

### Authentication Architecture
- **Middleware**: `utils/supabase/middleware.ts` handles session updates and role checks
- **Route Protection**: Automatic redirects based on authentication status and user roles
- **Server Actions**: Located in `app/auth/login/actions.ts` for login, signup, and signOut
- **Profile Creation**: Automatic profile creation via database triggers

### Environment Configuration
- Requires Supabase environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Known Issues
- Email confirmation flow needs improvement for password reset functionality (noted in README.md)

## Vencimientos Module (Policy Expiration Management)

### Module Overview
The vencimientos module (`/app/vencimientos/`) is a comprehensive insurance policy expiration management system that handles the complete workflow from data upload to letter generation and delivery.

### Key Features
- **Excel File Processing**: Upload and validate insurance policy data from Excel files
- **Dynamic Status Management**: Automatic classification (pending, due soon, critical, expired)
- **PDF Letter Generation**: Automated creation of policy expiration letters with multiple templates
- **WhatsApp Integration**: Direct messaging with formatted phone numbers
- **Bulk Operations**: Mass PDF generation, ZIP downloads, and email delivery
- **Real-time Dashboard**: Interactive data table with filtering, sorting, and pagination

### Component Architecture

#### Core Components
- `app/vencimientos/page.tsx` - Main module page with three views (upload, dashboard, critical-alerts)
- `components/vencimientos/FileUpload.tsx` - Drag & drop Excel file upload with validation
- `components/vencimientos/Dashboard.tsx` - Data table with advanced filtering and bulk operations
- `components/vencimientos/CriticalAlerts.tsx` - Priority alerts for urgent policy renewals

#### PDF Generation System
- `components/vencimientos/PDFGeneration/LetterGenerator.tsx` - Main PDF generation orchestrator
- `components/vencimientos/PDFGeneration/HealthTemplate.tsx` - Template for health insurance policies
- `components/vencimientos/PDFGeneration/AutomotorTemplate.tsx` - Template for automotive insurance
- `components/vencimientos/PDFGeneration/GeneralTemplate.tsx` - Template for general insurance policies
- `components/vencimientos/PDFGeneration/BaseTemplate.tsx` - Common template components

### Type System
- `types/insurance.ts` - Core insurance record types, validation rules, and system constants
- `types/pdf.ts` - PDF generation types, letter data structures, and template definitions

### Utilities
- `utils/excel.ts` - Excel file parsing, date conversion, data validation, and status determination
- `utils/pdfutils.ts` - Template selection logic, data grouping, currency formatting
- `utils/whatsapp.ts` - Phone number cleaning and WhatsApp message generation

### Data Flow
1. **Upload**: Excel file validation and parsing with ExcelJS
2. **Processing**: Data transformation, status calculation, and validation
3. **Dashboard**: Interactive data management with filtering and selection
4. **Generation**: PDF letter creation with appropriate templates
5. **Delivery**: Download as ZIP or direct WhatsApp messaging

### Business Logic
- **Status Classification**:
  - `pending` - 30+ days until expiration
  - `due_soon` - 6-30 days until expiration
  - `critical` - 5 days or less until expiration
  - `expired` - Already expired
- **Template Selection**: Automatic based on insurance type (salud/health, automotor/automotive, general)
- **Data Validation**: Comprehensive validation rules for required and optional fields

## Global Navigation

### Navbar System
- `components/ui/navbar.tsx` - Main navigation component with user authentication
- `components/layout/conditional-navbar.tsx` - Wrapper that hides navbar on auth routes
- **Navigation Links**:
  - Dashboard (Home icon) - Links to `/`
  - Pólizas (FileText icon) - Links to `/polizas`
  - Validación (CheckSquare icon) - Links to `/gerencia/validacion` (only visible for admin and usuario roles)
- **Features**: Logo display, role-based navigation, user profile dropdown, sign out functionality
- **Responsive design** with loading states and error handling
- **Role-based visibility**: Validación link only appears for users with admin or usuario roles

### Development Notes
- Path aliases configured with `@/*` pointing to root directory
- ESLint configured with Next.js core web vitals and TypeScript rules
- Theme provider configured for system/light/dark theme support with forced "clear" theme
- Global navbar integrated into root layout with conditional rendering
- always suggest the more reliable solution and follow the standard web practices, keep it simple and clean
- always when retrieving data and rendering on screen remember to take into account Initial load, Network transfer and Memory usage to keep a footprint on browser and Supabase bandwidth as low as possible for performance reasons

## Polizas Module (Insurance Policy Management System)

### Module Overview
The polizas module (`/app/polizas/`) is a comprehensive insurance policy registration and management system that handles the complete workflow from client search to policy creation with multiple insurance types (ramos).

### Key Features
- **Multi-step Form**: 6-step vertical accumulative form for policy creation
- **Client Search**: Search and select existing clients (natural/juridic persons) as policyholders
- **Multiple Insurance Types**: Support for different "ramos" (Automotor, Salud, Incendio, etc.) with specific fields
- **Vehicle Management**: Multiple vehicles per policy for Automotor ramo (1:N relationship)
- **Excel Import**: Bulk vehicle import from Excel files using ExcelJS
- **Payment Modalities**: Support for cash (contado) and credit (credito) with automatic quota calculation
- **Document Upload**: Attach multiple documents per policy with Supabase Storage integration
- **Audit Trail**: Complete traceability with created_by, updated_by, and full edit history
- **PDF Generation**: Summary PDF generation for review before saving

### Database Architecture

#### Core Tables
- `polizas` - Main policy table with common fields for all insurance types
- `polizas_pagos` - Payment quotas (installments) for each policy
- `polizas_documentos` - Documents attached to policies
- `polizas_automotor_vehiculos` - Vehicles for Automotor policies (1:N relationship)
- `polizas_historial_ediciones` - Complete audit log of all policy changes

#### Catalog Tables
- `companias_aseguradoras` - Insurance companies (17 preconfigured)
- `regionales` - Regional offices (9 departments of Bolivia)
- `categorias` - Client categories (groups, associations)
- `tipos_vehiculo` - Vehicle types (9 preconfigured)
- `marcas_vehiculo` - Vehicle brands (11 preconfigured)

#### Audit System
- Automatic capture of `created_by` and `updated_by` via database triggers
- `polizas_con_auditoria` view - Policies with user information
- `polizas_historial_vista` view - Edit history with user names
- Tracks: who created, who last edited, and complete change history

### Component Architecture

#### Policy Creation Flow (6 Steps)
1. **Buscar Asegurado** - Search and select policyholder from existing clients
2. **Datos Básicos** - Basic policy data (number, company, dates, responsible, etc.)
3. **Datos Específicos** - Insurance type specific data (e.g., vehicles for Automotor)
4. **Modalidad de Pago** - Payment modality (cash or credit with quotas)
5. **Cargar Documentos** - Upload policy documents
6. **Resumen** - Review all data with warnings before saving

#### Flow Characteristics
- **Vertical Accumulative**: All previous steps remain visible as you progress
- **Editable**: Can modify previous steps and update without losing data
- **Save on Completion**: Data only saved to database when user confirms in step 6
- **Validation**: Real-time validation before allowing navigation to next step

### Type System
- `types/poliza.ts` - Complete TypeScript definitions for all policy-related types (30+ types)
  - Catalog types, client types, form steps, payment modalities
  - Discriminated unions for insurance type specific data
  - Database types, validation types, Excel import types

### Utilities
- `utils/polizaValidation.ts` - Validation functions (9 functions)
  - Basic data validation, vehicle validation, payment validation
  - Date validation, unique plate checks
  - Automatic calculations (prima_neta, comision, quotas)
- `utils/vehiculoExcelImport.ts` - **ExcelJS-based** vehicle import
  - Flexible column mapping (case-insensitive, accent-insensitive)
  - Row-by-row validation with detailed error reporting
  - Template generation for correct Excel format

### Excel File Processing with ExcelJS
**IMPORTANT**: This project uses **ExcelJS** (NOT xlsx or other libraries) for all Excel file operations.

#### Installation
```bash
npm install exceljs
```

#### Usage Pattern
```typescript
import * as ExcelJS from 'exceljs';

// Reading Excel files
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(arrayBuffer);
const worksheet = workbook.worksheets[0];

// Iterating rows
worksheet.eachRow((row, rowNumber) => {
  const values = row.values; // Array of cell values
});

// Writing Excel files
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');
worksheet.addRow(['Header1', 'Header2']);
const buffer = await workbook.xlsx.writeBuffer();
```

#### ExcelJS Best Practices
- Always use `new ExcelJS.Workbook()` for workbook creation
- Use `workbook.xlsx.load(buffer)` for reading files in browser
- Access cells via `row.getCell(index)` or `row.values[index]`
- Cell indices start at 1 (not 0)
- Use `worksheet.eachRow()` or `worksheet.getRow()` for iteration
- Generate downloadable files with `workbook.xlsx.writeBuffer()`

### Business Logic

#### Payment Calculations
- **Prima Neta**: `prima_total * 0.87` (13% discount)
- **Comisión**: `prima_neta * 0.02` (2% commission)
- Both calculated automatically via database GENERATED columns

#### Credit Payment Distribution
- Initial quota can be specified
- Remaining amount distributed equally across installments
- Recalculates automatically when initial quota or number of installments changes
- Validates that sum of quotas equals total premium

#### Vehicle Management (Automotor)
- Multiple vehicles per policy (1:N relationship)
- Each vehicle has required fields: placa, valor_asegurado, franquicia, nro_chasis, uso
- Optional fields: tipo, marca, modelo, año, color, ejes, nro_motor, asientos, plaza
- Plate must be unique within same policy
- Support for bulk import via Excel (template available)

### Data Validation Rules
- End date must be after start date
- Emission date cannot be after start date
- Payment dates cannot be in the past (warning in summary)
- Plate uniqueness within policy
- All required fields validated before step progression
- Optional field warnings (non-blocking) shown in summary

### Step-by-Step Component Details

#### Step 4: Modalidad de Pago
- **Component**: `components/polizas/steps/ModalidadPago.tsx`
- **Features**:
  - Tabs for switching between "Contado" (cash) and "Crédito" (credit)
  - Automatic calculations displayed: prima_neta (87%) and comisión (2%)
  - **Editable installment amounts**: Users can manually adjust quota amounts for small corrections
  - Manual edits are reset when changing prima_total, cuota_inicial, or cantidad_cuotas
  - Interactive installment table with individual date pickers
  - Real-time validation and error display
  - Currency selector (Bs, USD, USDT, UFV)

#### Step 5: Cargar Documentos
- **Component**: `components/polizas/steps/CargarDocumentos.tsx`
- **Features**:
  - Drag & drop file upload (multiple files supported)
  - File type validation (PDF, JPG, PNG, DOC, DOCX)
  - File size validation (max 10MB per file)
  - Document type categorization (8 predefined types + custom)
  - Preview of uploaded files with size display
  - Documents are optional but recommended
  - Files stored in memory until final save

#### Step 6: Resumen y Confirmación
- **Component**: `components/polizas/steps/Resumen.tsx`
- **Features**:
  - Complete summary of all 6 steps
  - Automatic warning generation:
    - Payment dates in the past
    - Missing optional vehicle fields
    - No documents uploaded
  - Edit buttons for each step (jump back to edit)
  - Warning types: error (blocks save), warning (allows save with confirmation), info (informational)
  - Final "Guardar Póliza" button with loading state
  - Calls server action to persist to database

### Server Actions

#### Save Policy Action
- **File**: `app/polizas/nueva/actions.ts`
- **Function**: `guardarPoliza(formState: PolizaFormState)`
- **Process**:
  1. Validate authentication and required data
  2. Insert main policy record to `polizas` table
  3. Insert payment quotas to `polizas_pagos` table
  4. Insert vehicle data to `polizas_automotor_vehiculos` table (if Automotor)
  5. Upload documents to Supabase Storage bucket `polizas-documentos`
  6. Register document metadata in `polizas_documentos` table
  7. Revalidate `/polizas` path
  8. Return success/error response

#### Transaction Handling
- No explicit transactions implemented (Supabase limitation in serverless)
- Errors logged but don't rollback previous operations
- Consider implementing cleanup logic for failed saves

### Supabase Storage Configuration

#### Bucket Creation
- **Bucket name**: `polizas-documentos`
- **Public**: Yes (for document access from system)
- **Migration file**: `supabase/migrations/storage_polizas_documentos.sql`

#### Storage Policies (RLS)
- **Upload**: Authenticated users only
- **Read**: Public access (documents visible to system users)
- **Delete**: Only file owner can delete

#### Creating the Bucket
Execute from Supabase SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('polizas-documentos', 'polizas-documentos', true);
```

Or create via Supabase UI: Storage → New Bucket → Name: "polizas-documentos" → Public: ✓

### Implementation Status
✅ Database schema with audit trail
✅ TypeScript types (30+ types with discriminated unions)
✅ Validation utilities (9 functions)
✅ Excel import/export with ExcelJS
✅ Step 1: Search and select policyholder
✅ Step 2: Basic policy data
✅ Step 3: Insurance type router (Automotor fully implemented)
✅ Step 4: Payment modality with editable installments
✅ Step 5: Document upload
✅ Step 6: Summary with warnings and confirmation
✅ Server actions for database persistence
✅ Storage bucket configuration instructions

### File Structure
```
app/polizas/
  nueva/
    page.tsx              - Nueva póliza page wrapper
    actions.ts            - Server actions for saving policy
components/polizas/
  NuevaPolizaForm.tsx     - Main orchestrator (form state management)
  steps/
    BuscarAsegurado.tsx   - Step 1: Search client
    DatosBasicos.tsx      - Step 2: Basic data
    DatosEspecificos.tsx  - Step 3: Router for insurance types
    ModalidadPago.tsx     - Step 4: Payment modality
    CargarDocumentos.tsx  - Step 5: Document upload
    Resumen.tsx           - Step 6: Summary and save
  ramos/
    AutomotorForm.tsx     - Automotor-specific form
    VehiculoModal.tsx     - Add/edit vehicle modal
types/
  poliza.ts               - TypeScript type definitions
utils/
  polizaValidation.ts     - Validation functions
  vehiculoExcelImport.ts  - Excel import/export utilities
supabase/migrations/
  migration_polizas_system.sql           - Core tables and catalogs
  migration_add_audit_fields.sql         - Audit trail setup
  migration_historial_basico.sql         - Edit history tracking
  fix_rls_usuarios_comerciales.sql       - RLS fix for user dropdown
  storage_polizas_documentos.sql         - Storage bucket setup
```

### Document Soft Delete System

#### Overview
Documents implement a **soft delete** system where:
- **Comercial users**: Can only mark documents as "descartado" (discarded)
- **Admin users**: Can discard, restore, and permanently delete documents

#### Database Schema
- **Field**: `estado` in `polizas_documentos` table
- **Values**: `'activo'` (default) or `'descartado'`
- Documents with `estado = 'descartado'` are hidden from UI but remain in database and Storage

#### Storage RLS Policies
- Only users with `role = 'admin'` can physically DELETE files from Storage
- Comercial users can only mark documents as discarded via database function

#### Functions
- `descartar_documento(documento_id)` - Mark as discarded (comercial + admin)
- `restaurar_documento(documento_id)` - Restore to active (admin only)
- `eliminar_documento_permanente(documento_id)` - Delete from DB and Storage (admin only)

#### Server Actions
- **File**: `app/polizas/documentos/actions.ts`
- Functions: `descartarDocumento()`, `restaurarDocumento()`, `eliminarDocumentoPermanente()`
- Query helpers: `obtenerDocumentosActivos()`, `obtenerTodosDocumentos()` (admin only)

#### Documentation
- Complete guide: `docs/SOFT_DELETE_DOCUMENTOS.md`
- Migration: `supabase/migrations/storage_polizas_documentos.sql`

### Known Issues & Future Improvements
- Storage bucket must be created manually in Supabase
- No transaction rollback on partial failures
- Concurrent edit handling not implemented
- Document upload happens during save (no progress indicator)
- Consider adding scheduled job to clean old discarded documents (90+ days)
- Consider adding policy edit functionality
- Consider adding policy duplication/renewal functionality

## Gerencia Module (Management Validation System)

### Module Overview
The gerencia module (`/app/gerencia/`) provides managerial oversight and validation of insurance policies before they become active in the system. This implements a two-stage approval workflow where commercial users create policies in "pendiente" (pending) state, and managers validate them before activation.

### Key Features
- **Pending Policy Review**: View all policies awaiting validation
- **Policy Validation**: Approve policies to change status from "pendiente" to "activa"
- **Policy Rejection**: Reject policies (changes status to "cancelada")
- **Detailed Preview**: Review complete policy information before approval
- **Audit Trail**: Automatic tracking of who validated each policy and when
- **Role-based Access**: Only admin and usuario roles can access validation

### Database Schema Changes

#### Required SQL Migration
Execute this SQL in Supabase to enable the validation workflow:

```sql
-- Add 'pendiente' state to polizas table
ALTER TABLE polizas
DROP CONSTRAINT IF EXISTS polizas_estado_check;

ALTER TABLE polizas
ADD CONSTRAINT polizas_estado_check
CHECK (estado = ANY (ARRAY[
  'pendiente'::text,
  'activa'::text,
  'vencida'::text,
  'cancelada'::text,
  'renovada'::text
]));

-- Set default state to 'pendiente'
ALTER TABLE polizas
ALTER COLUMN estado SET DEFAULT 'pendiente'::text;

-- Add validation audit fields
ALTER TABLE polizas
ADD COLUMN IF NOT EXISTS validado_por uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS fecha_validacion timestamptz;

COMMENT ON COLUMN polizas.validado_por IS 'Manager who validated and activated the policy';
COMMENT ON COLUMN polizas.fecha_validacion IS 'Date and time of management validation';
```

#### New Fields
- `estado`: Now includes "pendiente" as default state for new policies
- `validado_por`: UUID reference to profiles - tracks which manager validated the policy
- `fecha_validacion`: Timestamp of when the policy was validated

### Component Architecture

#### Server Actions
- **File**: `app/gerencia/validacion/actions.ts`
- **Functions**:
  - `obtenerPolizasPendientes()` - Fetches all pending policies with related data
  - `validarPoliza(polizaId)` - Changes policy state to "activa" and records validator
  - `rechazarPoliza(polizaId, motivo?)` - Changes policy state to "cancelada" with optional reason

#### Pages
- **File**: `app/gerencia/validacion/page.tsx`
- Main validation page with authentication and role checks
- Displays table of pending policies
- Requires admin or usuario role

#### Components
- **File**: `components/gerencia/PolizasPendientesTable.tsx`
- Interactive table with policy details
- Actions: View details, Validate, Reject
- Real-time updates after validation/rejection
- Confirmation dialogs for all actions

### Workflow

#### 1. Policy Creation (Commercial Users)
```
User creates policy → Saved with estado='pendiente' → Not visible in active reports
```

#### 2. Management Validation
```
Manager accesses /gerencia/validacion → Reviews pending policies → Validates or Rejects
```

#### 3. After Validation
```
Validated: estado='activa', validado_por=manager_id, fecha_validacion=timestamp
Rejected: estado='cancelada', optional rejection reason in history
```

### Data Flow
1. Commercial user creates policy via `/polizas/nueva`
2. Policy saved with `estado='pendiente'` (actions.ts:50)
3. Manager navigates to `/gerencia/validacion`
4. Manager reviews policy details
5. Manager validates (activates) or rejects (cancels) policy
6. System records validation metadata (who, when)
7. Policy state changes trigger revalidation of routes

### Business Rules
- **Default State**: All new policies start as "pendiente"
- **Validation Permission**: Only admin and usuario roles can validate
- **Single Validation**: Once validated, policy cannot return to pending state
- **Audit Trail**: All state changes logged in `polizas_historial_ediciones`
- **Active Policies**: Only policies with `estado='activa'` appear in reports

### Type System Updates
- **File**: `types/poliza.ts:385-387`
- Added "pendiente" to estado union type
- Added optional fields: `validado_por`, `fecha_validacion`

### UI Features
- **Pending Count Badge**: Shows number of policies awaiting validation
- **Color Coding**: Yellow badges for pending status
- **Empty State**: Friendly message when no pending policies exist
- **Inline Details**: View policy information without leaving the table
- **Confirmation Dialogs**: Prevent accidental approvals/rejections

### Security Considerations
- Role-based access control (admin/usuario only)
- Authentication check before loading page
- Server-side validation of policy state before approval
- Automatic redirection for unauthorized users

### File Structure
```
app/gerencia/
  validacion/
    page.tsx              - Main validation page
    actions.ts            - Server actions for validation
components/gerencia/
  PolizasPendientesTable.tsx  - Interactive table component
types/
  poliza.ts             - Updated with pendiente state
```

### Integration Points
- **Policy Creation**: `app/polizas/nueva/actions.ts:50` - Creates with estado='pendiente'
- **Profile System**: Uses profiles.role for authorization
- **Audit System**: Integrates with polizas_historial_ediciones
- **Navigation**: Accessible from navbar "Validación" link (visible only to admin/usuario roles)

### Future Enhancements
- Dashboard widget showing pending policy count
- Email notifications to managers when policies await validation
- Bulk validation for multiple policies
- Rejection reason form with predefined options
- Filter/search in pending policies table
- Export pending policies list
- Manager-specific validation quotas or assignments
- Validation SLA tracking (time from creation to validation)
- el usuario siempre ejecuta las migraciones de supabase manualmente, Claude no tiene permiso de escritura solo de lectura