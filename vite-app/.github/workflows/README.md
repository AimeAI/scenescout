# GitHub Actions Setup

## Required Secrets

Add these secrets to your GitHub repository settings:

### Supabase Secrets
- `SUPABASE_ACCESS_TOKEN`: Your Supabase access token (sbp_...)
- `SUPABASE_PROJECT_REF`: Your project reference ID (e.g., fzsixhfhfndlpzfksdxm)
- `SUPABASE_DB_PASSWORD`: Your database password

### Optional Vercel Secrets (for deployment)
- `VERCEL_TOKEN`: Your Vercel deployment token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

## How to Add Secrets

1. Go to your GitHub repository
2. Click on Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with its name and value

## Workflow Triggers

The workflow runs automatically on:
- Every push to the `main` branch
- Manual trigger via GitHub Actions UI

## What the Workflow Does

1. Installs dependencies and Supabase CLI
2. Links to your Supabase project
3. Pushes all database migrations
4. Regenerates TypeScript types
5. Deploys all Edge Functions
6. Runs TypeScript checks
7. Builds the application
8. (Optional) Deploys to Vercel if configured