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

### Application Structure
- **App Directory**: Uses Next.js App Router structure
- **Authentication Flow**: Invitation-only system with role-based access control
- **Middleware**: Handles authentication state and role-based route protection
- **Components**: Reusable UI components in `/components/ui/`
- **Utils**: Supabase client configurations for server, client, and middleware

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

### Development Notes
- Path aliases configured with `@/*` pointing to root directory
- ESLint configured with Next.js core web vitals and TypeScript rules
- Theme provider configured for system/light/dark theme support with forced "clear" theme