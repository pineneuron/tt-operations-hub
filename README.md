# TT Operations Hub

<div align="center"><strong>Operations Management System</strong></div>
<div align="center">Built with Next.js 16 App Router</div>
<br />

## Overview

TT Operations Hub is a comprehensive operations management system designed for Tech Trust, providing features for attendance tracking, event management, meetings, task management, and transportation coordination.

## Tech Stack

- **Framework** - [Next.js 16](https://nextjs.org)
- **Language** - [TypeScript](https://www.typescriptlang.org)
- **Authentication** - [NextAuth.js v5](https://authjs.dev)
- **Database** - [PostgreSQL](https://www.postgresql.org) with [Prisma](https://www.prisma.io)
- **Error Tracking** - [Sentry](https://sentry.io/for/nextjs/)
- **Styling** - [Tailwind CSS v4](https://tailwindcss.com)
- **Components** - [Shadcn-ui](https://ui.shadcn.com)
- **Schema Validations** - [Zod](https://zod.dev)
- **State Management** - [Zustand](https://zustand-demo.pmnd.rs)
- **Search params state manager** - [Nuqs](https://nuqs.47ng.com/)
- **Tables** - [Tanstack Data Tables](https://ui.shadcn.com/docs/components/data-table)
- **Forms** - [React Hook Form](https://ui.shadcn.com/docs/components/form)
- **Command+k interface** - [kbar](https://kbar.vercel.app/)
- **Linting** - [ESLint](https://eslint.org)
- **Pre-commit Hooks** - [Husky](https://typicode.github.io/husky/)
- **Formatting** - [Prettier](https://prettier.io)

## Features

### Authentication
- Email/password authentication
- OTP (One-Time Password) login
- Password reset via OTP
- Role-based access control

### User Roles
- **Platform Admin** - Full system access and user management
- **Admin** - Access to all areas for monitoring and management
- **Finance** - Financial and transactional activity tracking
- **Staff** - Attendance, events, meetings, tasks, and transportation
- **Vendor/Supplier** - View assigned transactions and transportation bookings
- **Client** - View own event details and information

### Core Modules

#### Dashboard
- Overview with analytics and charts
- Recent notifications
- Summary cards (Attendance Compliance, Upcoming Events, Meetings Today)
- Role-based dashboard customization

#### Attendance
- Location-based check-in/check-out
- Attendance history
- Working hours calculation
- Admin attendance management

#### Events
- Upcoming and past events
- Event updates and reports
- Event status tracking
- Client and venue management

#### Meetings
- Meeting scheduling and management
- Meeting history
- Participant management
- Meeting summaries

#### To Do List
- Task creation and assignment
- Task status tracking
- Automatic notifications
- Task completion tracking

#### Transportation
- Transportation booking
- Vendor/Supplier assignment
- Trip entry and tracking
- Delivery status management

#### Kanban Board
- Drag and drop task management
- Local state persistence
- Task organization and prioritization

## Project Structure

```plaintext
src/
├── app/                    # Next.js App Router directory
│   ├── api/                # API routes
│   │   └── auth/           # Authentication endpoints
│   ├── auth/               # Auth pages (login, forgot-password, reset-password)
│   └── dashboard/          # Dashboard routes
│       ├── overview/       # Dashboard overview with parallel routes
│       ├── kanban/         # Kanban board
│       ├── product/        # Product management
│       └── profile/        # User profile
│
├── components/             # Shared components
│   ├── ui/                 # UI components (Shadcn)
│   ├── layout/             # Layout components (header, sidebar, etc.)
│   └── forms/              # Form components
│
├── features/               # Feature-based modules
│   ├── auth/               # Authentication components
│   ├── kanban/             # Kanban board components
│   ├── overview/           # Dashboard overview components
│   ├── products/            # Product management
│   └── profile/            # Profile management
│
├── lib/                    # Core utilities and configurations
│   ├── auth.ts             # NextAuth configuration
│   ├── auth-helpers.ts     # Auth utility functions
│   ├── db.ts               # Prisma client
│   ├── email.ts            # Email utilities (OTP, password reset)
│   └── utils.ts            # Shared utilities
│
├── hooks/                  # Custom React hooks
│
└── types/                  # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (package manager)
- PostgreSQL database
- SMTP server for email functionality

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tt-operations-hub
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp env.example.txt .env.local
```

4. Configure `.env.local` with your settings:
   - `DATABASE_URL` - PostgreSQL connection string
   - `NEXTAUTH_SECRET` - Secret key for JWT encryption
   - `NEXTAUTH_URL` - Base URL of your application
   - `SMTP_*` - SMTP configuration for email

5. Set up the database:
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed the database with initial users
pnpm db:seed
```

6. Start the development server:
```bash
pnpm dev
```

The application will be available at http://localhost:3000

### Default Users

After seeding, you can login with:
- **Admin**: `admin@techtrust.com.np` / `password123`
- **Admin**: `maheshbohara0101@gmail.com` / `password123`
- **Staff**: `staff@techtrust.com.np` / `password123`
- **Finance**: `finance@techtrust.com.np` / `password123`

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm format` - Format code with Prettier
- `pnpm db:seed` - Seed the database

## Database Management

### Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Open Prisma Studio (database GUI)
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name
```

## Environment Variables

See `env.example.txt` for all required environment variables. Key variables include:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for JWT encryption (generate with: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application base URL
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` - Email configuration

## License

See [LICENSE](LICENSE) file for details.
