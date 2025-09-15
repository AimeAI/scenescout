#!/usr/bin/env node

/**
 * SceneScout Smoke Test
 * 
 * Validates basic infrastructure is working:
 * - Build completes successfully
 * - TypeScript type checking passes
 * - Environment configuration is readable
 * - No critical import errors
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, access } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, prefix, message) {
  console.log(`${colors[color]}[${prefix}]${colors.reset} ${message}`)
}

function logInfo(message) {
  log('blue', 'INFO', message)
}

function logSuccess(message) {
  log('green', 'PASS', message)
}

function logWarning(message) {
  log('yellow', 'WARN', message)
}

function logError(message) {
  log('red', 'FAIL', message)
}

async function checkFileExists(filePath, description) {
  try {
    await access(join(rootDir, filePath))
    logSuccess(`${description} exists`)
    return true
  } catch {
    logError(`${description} missing: ${filePath}`)
    return false
  }
}

async function runCommand(command, description) {
  try {
    logInfo(`Running: ${description}...`)
    const { stdout, stderr } = await execAsync(command, { cwd: rootDir })
    
    if (stderr && !stderr.includes('warnings')) {
      logWarning(`${description} stderr: ${stderr.trim()}`)
    }
    
    logSuccess(`${description} completed`)
    return true
  } catch (error) {
    logError(`${description} failed: ${error.message}`)
    if (error.stdout) logError(`stdout: ${error.stdout}`)
    if (error.stderr) logError(`stderr: ${error.stderr}`)
    return false
  }
}

async function checkEnvironmentConfig() {
  try {
    logInfo('Checking environment configuration...')
    
    // Check if .env.example exists
    await checkFileExists('.env.example', '.env.example template')
    
    // Check vite-env.d.ts
    await checkFileExists('src/vite-env.d.ts', 'Vite environment types')
    
    // Validate core environment variables
    const envExample = await readFile(join(rootDir, '.env.example'), 'utf-8')
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
    
    for (const varName of requiredVars) {
      if (envExample.includes(varName)) {
        logSuccess(`Required env var ${varName} documented`)
      } else {
        logError(`Required env var ${varName} missing from .env.example`)
        return false
      }
    }
    
    logSuccess('Environment configuration valid')
    return true
  } catch (error) {
    logError(`Environment config check failed: ${error.message}`)
    return false
  }
}

async function checkSupabaseClient() {
  try {
    logInfo('Checking Supabase client configuration...')
    
    const clientPath = join(rootDir, 'src/lib/supabaseClient.ts')
    const clientContent = await readFile(clientPath, 'utf-8')
    
    // Check for proper typing
    if (clientContent.includes('Database>') && clientContent.includes('createClient<Database>')) {
      logSuccess('Supabase client properly typed')
    } else {
      logWarning('Supabase client may not be properly typed')
    }
    
    // Check for environment variable validation
    if (clientContent.includes('Missing VITE_SUPABASE_URL') && 
        clientContent.includes('Missing VITE_SUPABASE_ANON_KEY')) {
      logSuccess('Supabase client has environment validation')
    } else {
      logWarning('Supabase client missing environment validation')
    }
    
    return true
  } catch (error) {
    logError(`Supabase client check failed: ${error.message}`)
    return false
  }
}

async function checkCriticalFiles() {
  logInfo('Checking critical files...')
  
  const criticalFiles = [
    ['package.json', 'Package configuration'],
    ['tsconfig.json', 'TypeScript configuration'],
    ['vite.config.ts', 'Vite configuration'],
    ['tailwind.config.js', 'Tailwind configuration'],
    ['src/main.tsx', 'Application entry point'],
    ['src/App.tsx', 'Main application component'],
    ['src/lib/supabaseClient.ts', 'Supabase client'],
    ['src/types/database.types.ts', 'Database types']
  ]
  
  let allExist = true
  for (const [path, description] of criticalFiles) {
    const exists = await checkFileExists(path, description)
    if (!exists) allExist = false
  }
  
  return allExist
}

async function checkDatabaseMigrations() {
  logInfo('Checking database migrations...')
  
  const migrationFiles = [
    ['db/migrations/0001_core.sql', 'Core database schema'],
    ['db/migrations/0002_rpcs.sql', 'RPC functions'],
    ['db/migrations/test-queries.sql', 'Test queries'],
    ['scripts/apply-db-migrations.sh', 'Migration script']
  ]
  
  let allExist = true
  for (const [path, description] of migrationFiles) {
    const exists = await checkFileExists(path, description)
    if (!exists) allExist = false
  }
  
  return allExist
}

async function main() {
  console.log(`${colors.cyan}🚀 SceneScout Smoke Test${colors.reset}`)
  console.log(`${colors.cyan}========================${colors.reset}\n`)
  
  let allChecksPass = true
  
  // Check critical files
  if (!await checkCriticalFiles()) {
    allChecksPass = false
  }
  
  console.log()
  
  // Check environment configuration
  if (!await checkEnvironmentConfig()) {
    allChecksPass = false
  }
  
  console.log()
  
  // Check Supabase client
  if (!await checkSupabaseClient()) {
    allChecksPass = false
  }
  
  console.log()
  
  // Check database migrations
  if (!await checkDatabaseMigrations()) {
    allChecksPass = false
  }
  
  console.log()
  
  // Run TypeScript type checking
  if (!await runCommand('npm run typecheck', 'TypeScript type checking')) {
    allChecksPass = false
  }
  
  console.log()
  
  // Run linting (non-blocking)
  await runCommand('npm run lint', 'ESLint code checking')
  
  console.log()
  
  // Try to build the application
  if (!await runCommand('npm run build', 'Production build')) {
    allChecksPass = false
  }
  
  console.log('\n' + '='.repeat(50))
  
  if (allChecksPass) {
    logSuccess('All smoke tests passed! ✨')
    console.log(`${colors.green}SceneScout infrastructure is ready.${colors.reset}`)
    process.exit(0)
  } else {
    logError('Some smoke tests failed! ❌')
    console.log(`${colors.red}Please fix the issues above before proceeding.${colors.reset}`)
    process.exit(1)
  }
}

// Run the smoke test
main().catch((error) => {
  logError(`Smoke test crashed: ${error.message}`)
  console.error(error)
  process.exit(1)
})