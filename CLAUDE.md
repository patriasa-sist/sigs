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
- Features: Logo display, user profile dropdown, dashboard link, sign out functionality
- Responsive design with loading states and error handling

### Development Notes
- Path aliases configured with `@/*` pointing to root directory
- ESLint configured with Next.js core web vitals and TypeScript rules
- Theme provider configured for system/light/dark theme support with forced "clear" theme
- Global navbar integrated into root layout with conditional rendering