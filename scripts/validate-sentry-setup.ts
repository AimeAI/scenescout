#!/usr/bin/env tsx

/**
 * Sentry Setup Validation Script
 *
 * Validates that all required files and environment variables are present
 * for Sentry error tracking and performance monitoring.
 *
 * Usage: tsx scripts/validate-sentry-setup.ts
 */

import fs from 'fs';
import path from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);

  if (exists) {
    log(`✓ ${filePath}`, 'green');
  } else {
    log(`✗ ${filePath} - MISSING`, 'red');
  }

  return exists;
}

function checkEnvVar(varName: string, required: boolean = true): boolean {
  const value = process.env[varName];
  const exists = !!value && value !== '' && !value.includes('your-') && !value.includes('[');

  if (exists) {
    log(`✓ ${varName}`, 'green');
  } else if (required) {
    log(`✗ ${varName} - MISSING OR NOT CONFIGURED`, 'red');
  } else {
    log(`⚠ ${varName} - Optional, not configured`, 'yellow');
  }

  return exists || !required;
}

function validateSentrySetup() {
  log('\n=== Sentry Setup Validation ===\n', 'cyan');

  let allValid = true;

  // Check configuration files
  log('Configuration Files:', 'blue');
  allValid = checkFile('sentry.client.config.ts') && allValid;
  allValid = checkFile('sentry.server.config.ts') && allValid;
  allValid = checkFile('sentry.edge.config.ts') && allValid;
  allValid = checkFile('instrumentation.ts') && allValid;
  allValid = checkFile('next.config.js') && allValid;

  // Check utility files
  log('\nUtility Files:', 'blue');
  allValid = checkFile('src/lib/sentry.ts') && allValid;
  allValid = checkFile('src/lib/sentry-api-wrapper.ts') && allValid;
  allValid = checkFile('src/lib/web-vitals.ts') && allValid;

  // Check documentation
  log('\nDocumentation:', 'blue');
  checkFile('SENTRY_SETUP.md');
  checkFile('SENTRY_QUICK_REFERENCE.md');
  checkFile('SENTRY_IMPLEMENTATION_SUMMARY.md');

  // Check environment variables
  log('\nEnvironment Variables:', 'blue');

  // Load .env.local if it exists
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
  }

  allValid = checkEnvVar('NEXT_PUBLIC_SENTRY_DSN') && allValid;
  allValid = checkEnvVar('SENTRY_AUTH_TOKEN', false) && allValid;
  allValid = checkEnvVar('SENTRY_ORG', false) && allValid;
  allValid = checkEnvVar('SENTRY_PROJECT', false) && allValid;

  // Check package.json
  log('\nPackage Dependencies:', 'blue');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const hasSentry = !!packageJson.dependencies?.['@sentry/nextjs'];

    if (hasSentry) {
      log(`✓ @sentry/nextjs@${packageJson.dependencies['@sentry/nextjs']}`, 'green');
    } else {
      log('✗ @sentry/nextjs - NOT INSTALLED', 'red');
      allValid = false;
    }
  }

  // Check next.config.js for Sentry configuration
  log('\nNext.js Configuration:', 'blue');
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const nextConfig = fs.readFileSync(nextConfigPath, 'utf-8');

    const hasWithSentry = nextConfig.includes('withSentryConfig');
    const hasInstrumentation = nextConfig.includes('instrumentationHook: true');

    if (hasWithSentry) {
      log('✓ withSentryConfig wrapper configured', 'green');
    } else {
      log('✗ withSentryConfig wrapper - NOT CONFIGURED', 'red');
      allValid = false;
    }

    if (hasInstrumentation) {
      log('✓ Instrumentation hook enabled', 'green');
    } else {
      log('✗ Instrumentation hook - NOT ENABLED', 'red');
      allValid = false;
    }
  }

  // Summary
  log('\n=== Validation Summary ===\n', 'cyan');

  if (allValid) {
    log('✓ All required files and configuration are present!', 'green');
    log('\nNext Steps:', 'blue');
    log('1. Create a Sentry account at https://sentry.io', 'reset');
    log('2. Create a new Next.js project in Sentry', 'reset');
    log('3. Copy your DSN and auth token to .env.local', 'reset');
    log('4. Test the integration with a test error', 'reset');
    log('\nSee SENTRY_SETUP.md for detailed instructions.', 'reset');
  } else {
    log('✗ Some required files or configuration are missing!', 'red');
    log('\nPlease review the errors above and fix them.', 'reset');
    log('See SENTRY_SETUP.md for setup instructions.', 'reset');
    process.exit(1);
  }

  // Additional recommendations
  log('\n=== Recommendations ===\n', 'cyan');

  if (!process.env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN.includes('your-')) {
    log('⚠ SENTRY_AUTH_TOKEN not configured', 'yellow');
    log('  Source maps will not be uploaded to Sentry', 'reset');
    log('  Generate a token at: Settings > Auth Tokens', 'reset');
  }

  if (!process.env.SENTRY_ORG || process.env.SENTRY_ORG.includes('your-')) {
    log('⚠ SENTRY_ORG not configured', 'yellow');
    log('  Set this to your organization slug from Sentry', 'reset');
  }

  if (!process.env.SENTRY_PROJECT || process.env.SENTRY_PROJECT.includes('your-')) {
    log('⚠ SENTRY_PROJECT not configured', 'yellow');
    log('  Set this to your project slug from Sentry', 'reset');
  }

  // Check for example files that should be deleted
  const exampleFiles = [
    'src/lib/sentry-examples.ts',
    'src/app/api/example-sentry-integration/route.ts',
  ];

  const existingExamples = exampleFiles.filter((file) =>
    fs.existsSync(path.join(process.cwd(), file))
  );

  if (existingExamples.length > 0) {
    log('\n⚠ Example files found (should be deleted after review):', 'yellow');
    existingExamples.forEach((file) => {
      log(`  - ${file}`, 'reset');
    });
  }

  log(''); // Empty line at end
}

// Run validation
validateSentrySetup();
