#!/usr/bin/env node

/**
 * SceneScout v14 - Setup Verification Script
 * Verifies all components are properly configured
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log('green', `✅ ${message}`);
}

function error(message) {
  log('red', `❌ ${message}`);
}

function warning(message) {
  log('yellow', `⚠️  ${message}`);
}

function info(message) {
  log('blue', `ℹ️  ${message}`);
}

function header(message) {
  log('cyan', `\n🔍 ${message}`);
  log('cyan', '='.repeat(message.length + 3));
}

class VerificationAgent {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: []
    };
  }

  check(description, condition, errorMessage = null, warningMessage = null) {
    if (condition === true) {
      success(description);
      this.results.passed++;
      return true;
    } else if (condition === 'warning') {
      warning(`${description} - ${warningMessage || 'Check manually'}`);
      this.results.warnings++;
      return false;
    } else {
      error(`${description} - ${errorMessage || 'Failed'}`);
      this.results.failed++;
      this.results.issues.push(description);
      return false;
    }
  }

  async verifyFileStructure() {
    header('File Structure Verification');
    
    const requiredFiles = [
      'package.json',
      'next.config.js',
      'tsconfig.json',
      '.env',
      'config/.env.example',
      'README.md'
    ];

    const requiredDirs = [
      'src/app',
      'src/components',
      'src/lib',
      'src/types',
      'db',
      'supabase/functions',
      'scripts',
      'docs'
    ];

    requiredFiles.forEach(file => {
      this.check(
        `File exists: ${file}`,
        fs.existsSync(path.join(process.cwd(), file)),
        `Missing required file: ${file}`
      );
    });

    requiredDirs.forEach(dir => {
      this.check(
        `Directory exists: ${dir}`,
        fs.existsSync(path.join(process.cwd(), dir)),
        `Missing required directory: ${dir}`
      );
    });
  }

  async verifyPackageJson() {
    header('Package.json Verification');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      this.check(
        'Project name is scenescout-v14',
        packageJson.name === 'scenescout-v14'
      );

      const requiredScripts = [
        'dev', 'build', 'start', 'lint', 'typecheck',
        'bootstrap:local', 'db:apply', 'edge:deploy'
      ];

      requiredScripts.forEach(script => {
        this.check(
          `Script exists: ${script}`,
          packageJson.scripts && packageJson.scripts[script],
          `Missing npm script: ${script}`
        );
      });

      const requiredDeps = [
        '@supabase/supabase-js', 'next', 'react', 'react-dom',
        'typescript', 'tailwindcss', 'stripe'
      ];

      requiredDeps.forEach(dep => {
        const exists = (packageJson.dependencies && packageJson.dependencies[dep]) ||
                      (packageJson.devDependencies && packageJson.devDependencies[dep]);
        this.check(
          `Dependency: ${dep}`,
          exists,
          `Missing dependency: ${dep}`
        );
      });

    } catch (e) {
      this.check('Package.json is valid JSON', false, e.message);
    }
  }

  async verifyEnvironmentVariables() {
    header('Environment Variables Verification');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
      'NEXT_PUBLIC_VAPID_PUBLIC_KEY'
    ];

    const optionalVars = [
      'STRIPE_SECRET_KEY',
      'RESEND_API_KEY',
      'TICKETMASTER_API_KEY',
      'EVENTBRITE_API_KEY',
      'GOOGLE_PLACES_API_KEY'
    ];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      const hasValue = value && value !== `TODO_YOUR_${varName}` && !value.startsWith('TODO_');
      
      this.check(
        `Required env var: ${varName}`,
        hasValue,
        `Missing or not configured: ${varName}`
      );
    });

    optionalVars.forEach(varName => {
      const value = process.env[varName];
      const hasValue = value && value !== `TODO_YOUR_${varName}` && !value.startsWith('TODO_');
      
      this.check(
        `Optional env var: ${varName}`,
        hasValue ? true : 'warning',
        null,
        'Not configured - some features may not work'
      );
    });
  }

  async verifySupabaseConnection() {
    header('Supabase Connection Verification');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.check('Supabase credentials', false, 'Missing Supabase URL or key');
      return;
    }

    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Test connection
      const { data, error } = await supabase
        .from('cities')
        .select('count', { count: 'exact', head: true });

      this.check(
        'Supabase database connection',
        !error,
        error?.message || 'Connection failed'
      );

      if (!error) {
        info(`Database connection successful`);
      }

    } catch (e) {
      this.check('Supabase connection', false, e.message);
    }
  }

  async verifyDatabaseSchema() {
    header('Database Schema Verification');
    
    const sqlFiles = [
      'SCHEMA.sql', 'INDEXES.sql', 'RPC.sql', 'RLS.sql',
      'STRIPE_EXTRAS.sql', 'METRICS.sql', 'PUSH.sql',
      'PLANS.sql', 'SUBMISSIONS.sql', 'PROFILES.sql',
      'RPC_COUNTS.sql', 'RPC_SALES_TS.sql'
    ];

    sqlFiles.forEach(file => {
      const filePath = path.join('db', file);
      const exists = fs.existsSync(filePath);
      
      this.check(
        `SQL file: ${file}`,
        exists,
        `Missing SQL file: ${file}`
      );

      if (exists) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.check(
          `${file} has content`,
          content.length > 100,
          `${file} appears to be empty or too small`
        );
      }
    });
  }

  async verifyEdgeFunctions() {
    header('Edge Functions Verification');
    
    const functions = [
      'ingest_ticketmaster', 'ingest_eventbrite', 'ingest_songkick',
      'ingest_meetup', 'ingest_places_google', 'ingest_places_yelp',
      'daily_digest', 'reminders', 'enrich_images', 'hotness_ml'
    ];

    functions.forEach(funcName => {
      const funcPath = path.join('supabase', 'functions', funcName, 'index.ts');
      const exists = fs.existsSync(funcPath);
      
      this.check(
        `Edge function: ${funcName}`,
        exists,
        `Missing edge function: ${funcName}`
      );

      if (exists) {
        const content = fs.readFileSync(funcPath, 'utf8');
        this.check(
          `${funcName} has export`,
          content.includes('export') && content.includes('default'),
          `${funcName}/index.ts missing default export`
        );
      }
    });
  }

  async verifyNextJsSetup() {
    header('Next.js Setup Verification');
    
    // Check App Router structure
    const appFiles = [
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/globals.css',
      'src/app/feed/page.tsx',
      'src/app/account/page.tsx'
    ];

    appFiles.forEach(file => {
      this.check(
        `App Router file: ${file}`,
        fs.existsSync(file),
        `Missing App Router file: ${file}`
      );
    });

    // Check components
    const components = [
      'src/components/BlurImage.tsx',
      'src/components/EventCard.tsx',
      'src/components/Navigation.tsx'
    ];

    components.forEach(component => {
      this.check(
        `Component: ${component}`,
        fs.existsSync(component),
        `Missing component: ${component}`
      );
    });

    // Check lib files
    const libFiles = [
      'src/lib/supabase.ts',
      'src/lib/utils.ts',
      'src/types/index.ts'
    ];

    libFiles.forEach(file => {
      this.check(
        `Library file: ${file}`,
        fs.existsSync(file),
        `Missing library file: ${file}`
      );
    });
  }

  async verifyBuildProcess() {
    header('Build Process Verification');
    
    try {
      // Check if TypeScript compiles
      const { execSync } = require('child_process');
      
      info('Running TypeScript check...');
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      success('TypeScript compilation check passed');
      this.results.passed++;

    } catch (e) {
      this.check('TypeScript compilation', false, 'TypeScript errors found');
    }

    try {
      info('Running ESLint check...');
      execSync('npm run lint', { stdio: 'pipe' });
      success('ESLint check passed');
      this.results.passed++;

    } catch (e) {
      this.check('ESLint', 'warning', null, 'Linting issues found - check manually');
    }
  }

  generateReport() {
    header('Verification Report');
    
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const passRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;

    log('bright', `\nTotal Checks: ${total}`);
    success(`Passed: ${this.results.passed}`);
    if (this.results.warnings > 0) {
      warning(`Warnings: ${this.results.warnings}`);
    }
    if (this.results.failed > 0) {
      error(`Failed: ${this.results.failed}`);
    }
    
    log('bright', `\nOverall Health: ${passRate}%`);

    if (passRate >= 90) {
      success('🎉 Excellent! Your SceneScout setup is ready for development.');
    } else if (passRate >= 70) {
      warning('⚠️  Good setup, but some issues need attention.');
    } else {
      error('❌ Several critical issues found. Please address them before proceeding.');
    }

    if (this.results.issues.length > 0) {
      log('red', '\n🔧 Critical Issues to Address:');
      this.results.issues.forEach(issue => {
        log('red', `   • ${issue}`);
      });
    }

    if (this.results.warnings > 0) {
      log('yellow', '\n💡 Recommendations:');
      log('yellow', '   • Configure optional API keys for full functionality');
      log('yellow', '   • Review and fix any linting issues');
      log('yellow', '   • Test all major features manually');
    }

    log('bright', '\n📋 Next Steps:');
    log('blue', '   1. Address any critical issues above');
    log('blue', '   2. Set up Supabase project and apply database schema');
    log('blue', '   3. Deploy edge functions to Supabase');
    log('blue', '   4. Test the application: npm run dev');
    log('blue', '   5. Deploy to production when ready');
  }

  async runAllChecks() {
    log('cyan', '🚀 SceneScout v14 - Setup Verification');
    log('cyan', '=====================================\n');

    await this.verifyFileStructure();
    await this.verifyPackageJson();
    await this.verifyEnvironmentVariables();
    await this.verifySupabaseConnection();
    await this.verifyDatabaseSchema();
    await this.verifyEdgeFunctions();
    await this.verifyNextJsSetup();
    await this.verifyBuildProcess();

    this.generateReport();
  }
}

// Run verification if called directly
if (require.main === module) {
  const agent = new VerificationAgent();
  agent.runAllChecks().catch(console.error);
}

module.exports = VerificationAgent;