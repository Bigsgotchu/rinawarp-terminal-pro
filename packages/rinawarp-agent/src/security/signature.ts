/**
 * Agent Signature Verification
 *
 * Provides cryptographic signing and verification for agent packages.
 * This ensures agents haven't been tampered with after publishing.
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * Key pair for signing agents
 */
export interface KeyPair {
  privateKey: string
  publicKey: string
  keyId: string
}

/**
 * Signature metadata
 */
export interface SignatureMetadata {
  algorithm: string
  signature: string
  signedAt: string
  keyId: string
  packageName: string
  packageVersion: string
}

/**
 * Generate a new signing key pair
 * @param keyId - Optional key identifier
 * @returns Generated key pair
 */
export function generateKeyPair(keyId?: string): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  return {
    privateKey,
    publicKey,
    keyId: keyId || `key-${Date.now()}`,
  }
}

/**
 * Sign an agent package
 * @param data - Data to sign (Buffer or string)
 * @param privateKey - Private key for signing
 * @param keyId - Key identifier
 * @param packageName - Package name
 * @param packageVersion - Package version
 * @returns Signature metadata
 */
export function signPackage(
  data: Buffer | string,
  privateKey: string,
  keyId: string,
  packageName: string,
  packageVersion: string
): SignatureMetadata {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data

  // Create signature
  const sign = crypto.createSign('SHA256')
  sign.update(buffer)
  sign.end()

  const signature = sign.sign(privateKey, 'hex')

  return {
    algorithm: 'RSA-SHA256',
    signature,
    signedAt: new Date().toISOString(),
    keyId,
    packageName,
    packageVersion,
  }
}

/**
 * Verify an agent package signature
 * @param data - Original data that was signed
 * @param signature - Signature to verify
 * @param publicKey - Public key for verification
 * @returns True if signature is valid
 */
export function verifySignature(data: Buffer | string, signature: string, publicKey: string): boolean {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data

  const verify = crypto.createVerify('SHA256')
  verify.update(buffer)
  verify.end()

  return verify.verify(publicKey, signature, 'hex')
}

/**
 * Verify signature metadata
 * @param data - Original data
 * @param metadata - Signature metadata
 * @param publicKey - Public key for verification
 * @returns True if verification succeeds
 */
export function verifyPackage(data: Buffer | string, metadata: SignatureMetadata, publicKey: string): boolean {
  return verifySignature(data, metadata.signature, publicKey)
}

/**
 * Sign a file and write signature to disk
 * @param filePath - Path to file to sign
 * @param privateKey - Private key
 * @param keyId - Key identifier
 * @param packageName - Package name
 * @param packageVersion - Package version
 * @param outputPath - Optional output path for signature file
 * @returns Path to signature file
 */
export function signFile(
  filePath: string,
  privateKey: string,
  keyId: string,
  packageName: string,
  packageVersion: string,
  outputPath?: string
): string {
  const data = fs.readFileSync(filePath)
  const metadata = signPackage(data, privateKey, keyId, packageName, packageVersion)

  const sigPath = outputPath || `${filePath}.sig`
  fs.writeFileSync(sigPath, JSON.stringify(metadata, null, 2), 'utf8')

  return sigPath
}

/**
 * Verify a signed file
 * @param filePath - Path to file to verify
 * @param signaturePath - Path to signature file
 * @param publicKey - Public key for verification
 * @returns Verification result
 */
export function verifyFile(
  filePath: string,
  signaturePath: string,
  publicKey: string
): { valid: boolean; metadata?: SignatureMetadata; error?: string } {
  try {
    // Read original file
    const data = fs.readFileSync(filePath)

    // Read signature
    if (!fs.existsSync(signaturePath)) {
      return { valid: false, error: 'Signature file not found' }
    }

    const sigContent = fs.readFileSync(signaturePath, 'utf8')
    const metadata = JSON.parse(sigContent) as SignatureMetadata

    // Verify
    const valid = verifyPackage(data, metadata, publicKey)

    return { valid, metadata }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a signed agent package
 * @param agentDir - Agent directory path
 * @param privateKey - Private key for signing
 * @param keyId - Key identifier
 * @returns Signed package with signature metadata
 */
export async function createSignedPackage(
  agentDir: string,
  privateKey: string,
  keyId: string
): Promise<{
  manifest: Record<string, unknown>
  signature: SignatureMetadata
  packagePath: string
}> {
  const manifestPath = path.join(agentDir, 'agent.json')

  if (!fs.existsSync(manifestPath)) {
    throw new Error('Agent manifest not found')
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(manifestContent)

  if (!manifest.name || !manifest.version) {
    throw new Error('Invalid manifest: name and version are required')
  }

  // Sign the manifest
  const signature = signPackage(manifestContent, privateKey, keyId, manifest.name, manifest.version)

  return {
    manifest,
    signature,
    packagePath: manifestPath,
  }
}

/**
 * Verify a signed agent package on installation
 * @param agentDir - Agent directory path
 * @param publicKey - Public key for verification
 * @returns Verification result
 */
export function verifyInstalledPackage(
  agentDir: string,
  publicKey: string
): { valid: boolean; manifest?: Record<string, unknown>; error?: string } {
  try {
    const manifestPath = path.join(agentDir, 'agent.json')
    const sigPath = path.join(agentDir, 'agent.json.sig')

    if (!fs.existsSync(manifestPath)) {
      return { valid: false, error: 'Agent manifest not found' }
    }

    // If no signature file, warn but allow installation
    // (for backward compatibility)
    if (!fs.existsSync(sigPath)) {
      console.warn('[Security] Agent is not signed. Consider only installing signed agents.')
      return {
        valid: true,
        manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
      }
    }

    // Verify signature
    const result = verifyFile(manifestPath, sigPath, publicKey)

    if (!result.valid || !result.metadata) {
      return { valid: false, error: result.error || 'Signature verification failed' }
    }

    // Verify the manifest matches the signed version
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

    if (result.metadata.packageName !== manifest.name || result.metadata.packageVersion !== manifest.version) {
      return { valid: false, error: 'Manifest version mismatch after signature' }
    }

    return { valid: true, manifest }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Load public key from PEM file
 */
export function loadPublicKey(keyPath: string): string {
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Public key not found: ${keyPath}`)
  }
  return fs.readFileSync(keyPath, 'utf8')
}

/**
 * Load private key from PEM file
 */
export function loadPrivateKey(keyPath: string): string {
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Private key not found: ${keyPath}`)
  }
  return fs.readFileSync(keyPath, 'utf8')
}

/**
 * Create a hash of the agent package for integrity checking
 */
export function createPackageHash(data: Buffer | string): string {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data
  return crypto.createHash('sha256').update(buffer).digest('hex')
}
