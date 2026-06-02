import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const builderConfig = path.join(root, 'apps/terminal-pro/electron-builder.yml')
const afterSign = path.join(root, 'apps/terminal-pro/build/afterSign.cjs')

const requiredFiles = [builderConfig, afterSign]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required signing file: ${file}`)
  }
}

const configText = fs.readFileSync(builderConfig, 'utf8')

const requiredConfig = [
  'appId: com.rinawarptech.terminalpro',
  'productName: RinaWarp Terminal Pro',
  'hardenedRuntime: true',
  'entitlements: build/entitlements.mac.plist',
  'afterSign:',
]

for (const line of requiredConfig) {
  if (!line.endsWith(':')) {
    if (!configText.includes(line)) {
      throw new Error(`Missing required config in electron-builder.yml: ${line}`)
    }
  } else if (!configText.includes(line)) {
    throw new Error(`Missing required config in electron-builder.yml: ${line}`)
  }
}

const isRelease = process.env.RINAWARP_RELEASE === '1'

if (isRelease) {
  const required = [
    'APPLE_ID',
    'APPLE_ID_PASSWORD',
    'APPLE_TEAM_ID',
    'CSC_LINK',
    'CSC_KEY_PASSWORD',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required release signing env: ${key}`)
    }
  }
}

console.log('[signing] config verification passed')
