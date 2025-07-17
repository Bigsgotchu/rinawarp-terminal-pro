# doorsmash - Elite Dating Platform

**Copyright (c) 2024 rinawarp Technologies, LLC. All rights reserved.**

## Overview

doorsmash is a premium dating platform designed for high-profile professionals seeking meaningful connections. The platform features:

- **$100 minimum entry fee** to ensure serious, quality members
- **Comprehensive verification system** including ID, photo, and background checks
- **No fake profiles or scams** - verified members only
- **High-profile professional network** with privacy and discretion
- **No strings attached** dating experience

## Features

- ✅ User registration with payment integration
- ✅ Multi-step verification process
- ✅ Secure payment processing via Stripe
- ✅ Real-time matching system
- ✅ Encrypted messaging
- ✅ Profile photo management
- ✅ Advanced search and filtering
- ✅ Admin dashboard for moderation

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Node.js
- **Database**: PostgreSQL with Supabase
- **Payment**: Stripe integration
- **Authentication**: JWT with bcrypt hashing
- **Storage**: AWS S3 for file uploads
- **Verification**: Jumio integration for ID verification

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database or Supabase account
- Stripe account
- AWS account (for file storage)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

3. Configure your `.env.local` file with:
- Database connection (PostgreSQL or Supabase)
- Stripe API keys
- JWT secret
- AWS S3 credentials
- Email service settings

4. Set up the database:
```bash
# If using PostgreSQL directly
psql -U postgres -d doorsmash -f schema.sql

# If using Supabase, run the SQL in the Supabase dashboard
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The platform uses a comprehensive database schema with tables for:
- Users and authentication
- Payment processing
- Verification records
- User profiles and photos
- Matching and messaging
- Reports and moderation

See `schema.sql` for the complete database structure.

## Payment Integration

The platform integrates with Stripe for:
- One-time $100 registration fee
- Optional subscription management
- Secure payment processing
- Webhook handling for payment events

## Verification System

Multi-layer verification includes:
- **ID Verification**: Government-issued ID validation
- **Photo Verification**: Selfie matching with ID photo
- **Phone Verification**: SMS-based phone number confirmation
- **Social Verification**: Optional social media account linking
- **Background Checks**: Optional professional background verification

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure file upload handling
- HTTPS enforcement in production

## Deployment

### Production Checklist

1. Set up production database
2. Configure production environment variables
3. Set up Stripe webhooks
4. Configure AWS S3 bucket
5. Set up email service
6. Configure domain and SSL
7. Set up monitoring and logging

### Recommended Hosting

- **Frontend**: Vercel, Netlify, or AWS Amplify
- **Database**: Supabase, AWS RDS, or Railway
- **File Storage**: AWS S3 or Cloudflare R2

## License

© 2024 rinawarp Technologies, LLC. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

**doorsmash** - Where serious professionals find meaningful connections.
