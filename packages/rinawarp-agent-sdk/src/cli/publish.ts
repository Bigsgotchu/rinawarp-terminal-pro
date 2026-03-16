/**
 * Publish Agent CLI Command
 *
 * Validates, signs, and publishes an agent to the marketplace.
 */

import fs from 'fs'
import path from 'path'
import {
  validateManifest,
  loadManifest,
  createSignedPackage,
  generateKeyPair,
  loadPrivateKey,
} from '@rinawarp/agent/security/permissions.js'
import { scanForDangerousPatterns } from '@rinawarp/agent/security/sandbox.js'

interface PublishOptions {
  agentDir?: string
  apiUrl?: string
  signKey?: string
  skipSignature?: boolean
}

/**
 * Publish an agent to the marketplace
 */
export async function publish(options: PublishOptions): Promise<void> {
  const agentDir = options.agentDir || process.cwd()
  const manifestPath = path.join(agentDir, 'agent.json')

  console.log(`Publishing agent from: ${agentDir}`)

  // Validate manifest exists
  if (!fs.existsSync(manifestPath)) {
    console.error('Error: agent.json not found in current directory')
    process.exit(1)
  }

  // Load and validate manifest
  console.log('Validating manifest...')
  let manifest: Record<string, unknown>
  try {
    const content = fs.readFileSync(manifestPath, 'utf8')
    manifest = JSON.parse(content)
  } catch (error) {
    console.error('Error: Failed to read agent.json:', error)
    process.exit(1)
  }

  const errors = validateManifest(manifest)
  if (errors.length > 0) {
    console.error('Error: Invalid manifest:')
    errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }
  console.log('✓ Manifest is valid')

  // Check code for dangerous patterns
  const entryPoint = manifest.entry as string
  const codePath = path.join(agentDir, entryPoint)

  if (fs.existsSync(codePath)) {
    console.log('Scanning for dangerous patterns...')
    const code = fs.readFileSync(codePath, 'utf8')
    const warnings = scanForDangerousPatterns(code)

    if (warnings.length > 0) {
      console.warn('Warning: Code contains potentially dangerous patterns:')
      warnings.forEach((w) => console.warn(`  - ${w}`))
      console.warn('\nThis agent may be rejected by the marketplace.')
    }
    console.log('✓ Code scan complete')
  }

  // Sign the agent (if key provided or generate one)
  let signature: string | undefined
  if (!options.skipSignature) {
    console.log('Signing agent...')

    try {
      let privateKey: string

      if (options.signKey) {
        privateKey = loadPrivateKey(options.signKey)
      } else {
        // Generate a temporary key for signing (in production, use persistent keys)
        const keyPair = generateKeyPair()
        privateKey = keyPair.privateKey
        console.log('  (Generated temporary signing key - use --sign-key for persistent keys)')
      }

      const signed = await createSignedPackage(agentDir, privateKey, 'default-key')
      signature = signed.signature.signature

      console.log(`✓ Agent signed at ${signed.signature.signedAt}`)
    } catch (error) {
      console.warn('Warning: Failed to sign agent:', error)
    }
  }

  // Publish to marketplace
  const apiUrl = options.apiUrl || 'https://rinawarptech.com'
  console.log(`Publishing to: ${apiUrl}/v1/agents/publish`)

  const publishData = {
    ...manifest,
    signature,
    signatureAlgorithm: 'RSA-SHA256',
  }

  try {
    const response = await fetch(`${apiUrl}/v1/agents/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publishData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error: Failed to publish (${response.status}): ${errorText}`)
      process.exit(1)
    }

    const result = await response.json()

    if (result.success) {
      console.log('\n✓ Agent published successfully!')
      console.log(`  Name: ${manifest.name}`)
      console.log(`  Version: ${manifest.version}`)
      console.log(`  Permissions: ${(manifest.permissions as string[]).join(', ')}`)
      if (signature) {
        console.log(`  Signature: ${signature.substring(0, 16)}...`)
      }
      console.log(`\n  Marketplace URL: ${apiUrl}/agents/${manifest.name}`)
    } else {
      console.error('Error: Publish failed:', result.error)
      process.exit(1)
    }
  } catch (error) {
    console.error('Error: Failed to connect to marketplace:', error)
    process.exit(1)
  }
}

/**
 * Parse CLI arguments for publish command
 */
export function parsePublishArgs(args: string[]): PublishOptions {
  const options: PublishOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--dir' && args[i + 1]) {
      options.agentDir = args[++i]
    } else if (arg === '--api-url' && args[i + 1]) {
      options.apiUrl = args[++i]
    } else if (arg === '--sign-key' && args[i + 1]) {
      options.signKey = args[++i]
    } else if (arg === '--skip-signature') {
      options.skipSignature = true
    }
  }

  return options
}

export default { publish, parsePublishArgs }
