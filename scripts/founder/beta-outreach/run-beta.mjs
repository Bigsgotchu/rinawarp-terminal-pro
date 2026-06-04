#!/usr/bin/env node
/**
 * Safe one-command beta automation runner
 * 
 * Usage:
 *   npm run beta:run              # Prep + dry-run
 *   npm run beta:run -- --send    # Also send emails
 * 
 * Does NOT:
 *   - Scrape emails
 *   - Auto-DM strangers
 *   - Auto-post to social platforms
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const TRACKER_PATH = process.env.BETA_TRACKER_PATH || `${process.env.HOME}/RINAWARP_RECOVERY/BETA_TRACKER.md`
const SEND_MODE = process.argv.includes('--send')

const PLACEHOLDER_EMAILS = [
  'email@example.com',
  'test@example.com',
  'gate15-smoke@example.com',
  'gate15-blocker@example.com',
  'angeltolon24@gmail.com',
  'jonathan.halling@icloud.com',
  'camillejones68@gmail.com',
  'Mytonite86@gmail.com',
  'nsraymond@yahoo.com',
]

const PLACEHOLDER_LEADS = [
  'Actual Name',
  'Name / profile-or-email',
  'Sample Linux Tester',
  'Sample macOS Tester',
  'Sample Windows Tester',
  'Real Linux Tester',
]

function run(cmd, options = {}) {
  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit' })
    return result
  } catch (e) {
    if (!options.allowFail) {
      console.error(`Command failed: ${cmd}`)
      throw e
    }
    return ''
  }
}

function cleanTracker() {
  if (!fs.existsSync(TRACKER_PATH)) return
  
  let content = fs.readFileSync(TRACKER_PATH, 'utf8')
  let changed = false
  
  PLACEHOLDER_LEADS.forEach(lead => {
    const regex = new RegExp(`- \\[ \\] \\*\\*${lead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*.*\\n?`.replace(/\\n/g, '\\n'), 'g')
    if (regex.test(content)) {
      content = content.replace(regex, '')
      changed = true
    }
  })
  
  if (changed) {
    fs.writeFileSync(TRACKER_PATH, content)
    console.log('✅ Cleaned placeholder leads from tracker')
  }
}

function getRealSignups() {
  const sql = "SELECT name,email,os,created_at FROM beta_signups WHERE email NOT IN ('email@example.com','test@example.com','gate15-smoke@example.com','gate15-blocker@example.com') AND email IS NOT NULL ORDER BY created_at DESC LIMIT 10;"
  const result = run(
    `wrangler d1 execute rinawarp-users --remote --command "${sql}"`,
    { silent: true }
  )
  
  const match = result.match(/\[[\s\S]*?\]/)
  if (!match) return []
  
  try {
    const data = JSON.parse(match[0])
    return data.results || []
  } catch {
    return []
  }
}

function main() {
  console.log('=== RinaWarp Terminal Pro Beta Runner ===\n')
  
  // 1. Verify repo
  console.log('1. Verifying repo...')
  run('npm run founder:check-repo')
  console.log('')
  
  // 2. Clean placeholder leads
  console.log('2. Cleaning placeholder leads...')
  cleanTracker()
  console.log('')
  
  // 3. Export real signups
  console.log('3. Checking for real beta signups...')
  const signups = getRealSignups()
  console.log(`   Found ${signups.length} real opt-in signup(s)`)
  console.log('')
  
  // 4. Generate outreach copy
  console.log('4. Generating outreach copy...')
  run('npm run beta:outreach:generate')
  console.log('')
  
  // 5. Show leads
  console.log('5. Current beta leads...')
  run('npm run beta:outreach:show-leads', { silent: true })
  console.log('')
  
  // 6. Dry-run welcome emails
  console.log('6. Checking email recipients...')
  const realEmails = signups
    .filter(s => s.email && !PLACEHOLDER_EMAILS.includes(s.email))
    .map(s => ({ name: s.name, email: s.email }))
  
  if (realEmails.length === 0) {
    console.log('   No real beta signups yet. Post outreach copy manually and send people to /beta.')
    console.log('')
    console.log('=== Next Action ===')
    console.log('Post the generated LinkedIn/Reddit copy manually.')
    console.log('Send people to: https://www.rinawarptech.com/beta/')
    process.exit(0)
  }
  
  console.log(`   Would send to ${realEmails.length} real tester(s)`)
  console.log('')
  
  // 7. Dry-run or send
  console.log('7. Email dry-run...')
  if (SEND_MODE) {
    console.log('   Sending emails to real opt-in signups...')
    run('npm run beta:email-welcome -- --send')
  } else {
    run('npm run beta:email-welcome -- --dry-run')
  }
  console.log('')
  
  console.log('=== Complete ===')
  console.log('Next: Post outreach copy manually, then run with --send when ready.')
}

main()