#!/usr/bin/env tsx

/**
 * Environment Variable Validation Script
 * Run this script to validate your environment configuration
 *
 * Usage:
 *   npm run validate:env
 *   or
 *   npx tsx scripts/validate-env.ts
 */

import { config } from 'dotenv'
import { validateEnvironment, formatValidationReport } from '../src/lib/env-validation'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

console.log('\n🔍 Validating environment variables...\n')

const result = validateEnvironment({ strictMode: true })

console.log(formatValidationReport(result))

if (!result.valid) {
  process.exit(1)
}

if (result.warnings.length === 0) {
  console.log('\n✅ All environment variables are properly configured!\n')
}

process.exit(0)
