// @ts-nocheck

export function createRuntimeUtils(deps) {
  const { app, dialog, path, crypto, process, os, fs, isE2E } = deps

  function crc32(buf) {
    let crc = 0xffffffff
    for (const b of buf) {
      crc ^= b
      for (let i = 0; i < 8; i += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
      }
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  function zipFiles(files) {
    const localHeaders = []
    const centralHeaders = []
    let offset = 0
    for (const f of files) {
      const nameBuf = Buffer.from(f.name, 'utf8')
      const dataBuf = f.data
      const checksum = crc32(dataBuf)
      const local = Buffer.alloc(30)
      local.writeUInt32LE(0x04034b50, 0)
      local.writeUInt16LE(20, 4)
      local.writeUInt16LE(0, 6)
      local.writeUInt16LE(0, 8)
      local.writeUInt16LE(0, 10)
      local.writeUInt16LE(0, 12)
      local.writeUInt32LE(checksum, 14)
      local.writeUInt32LE(dataBuf.length, 18)
      local.writeUInt32LE(dataBuf.length, 22)
      local.writeUInt16LE(nameBuf.length, 26)
      local.writeUInt16LE(0, 28)
      const localEntry = Buffer.concat([local, nameBuf, dataBuf])
      localHeaders.push(localEntry)
      const central = Buffer.alloc(46)
      central.writeUInt32LE(0x02014b50, 0)
      central.writeUInt16LE(20, 4)
      central.writeUInt16LE(20, 6)
      central.writeUInt16LE(0, 8)
      central.writeUInt16LE(0, 10)
      central.writeUInt16LE(0, 12)
      central.writeUInt16LE(0, 14)
      central.writeUInt32LE(checksum, 16)
      central.writeUInt32LE(dataBuf.length, 20)
      central.writeUInt32LE(dataBuf.length, 24)
      central.writeUInt16LE(nameBuf.length, 28)
      central.writeUInt16LE(0, 30)
      central.writeUInt16LE(0, 32)
      central.writeUInt16LE(0, 34)
      central.writeUInt16LE(0, 36)
      central.writeUInt32LE(0, 38)
      central.writeUInt32LE(offset, 42)
      centralHeaders.push(Buffer.concat([central, nameBuf]))
      offset += localEntry.length
    }
    const centralStart = offset
    const centralBlob = Buffer.concat(centralHeaders)
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(0x06054b50, 0)
    eocd.writeUInt16LE(0, 4)
    eocd.writeUInt16LE(0, 6)
    eocd.writeUInt16LE(files.length, 8)
    eocd.writeUInt16LE(files.length, 10)
    eocd.writeUInt32LE(centralBlob.length, 12)
    eocd.writeUInt32LE(centralStart, 16)
    eocd.writeUInt16LE(0, 20)
    return Buffer.concat([...localHeaders, centralBlob, eocd])
  }

  async function showSaveDialogForBundle(defaultPath) {
    if (isE2E) {
      return {
        canceled: false,
        filePath: path.join(
          app.getPath('temp'),
          `rinawarp-support-bundle-e2e-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.zip`
        ),
      }
    }
    return dialog.showSaveDialog({
      title: 'Save Support Bundle',
      defaultPath,
      filters: [{ name: 'Zip', extensions: ['zip'] }],
    })
  }

  function safeSend(target, channel, payload) {
    if (!target) return false
    try {
      if (target.isDestroyed()) return false
      target.send(channel, payload)
      return true
    } catch {
      return false
    }
  }

  function importShellHistory(limit = 300) {
    const home = process.env.HOME || os.homedir()
    const files = [
      path.join(home, '.bash_history'),
      path.join(home, '.zsh_history'),
      path.join(home, '.local', 'share', 'fish', 'fish_history'),
    ]
    const out = []
    const seen = new Set()
    for (const file of files) {
      if (!fs.existsSync(file)) continue
      let raw = ''
      try {
        raw = fs.readFileSync(file, 'utf-8')
      } catch {
        continue
      }
      for (const line of raw.split(/\r?\n/)) {
        let cmd = String(line || '').trim()
        if (!cmd) continue
        if (cmd.startsWith(': ')) {
          const idx = cmd.indexOf(';')
          if (idx > -1) cmd = cmd.slice(idx + 1).trim()
        }
        if (cmd.includes('- cmd:')) continue
        if (cmd.startsWith('- cmd:')) cmd = cmd.replace(/^- cmd:\s*/, '').trim()
        if (!cmd || cmd.length < 2) continue
        if (!seen.has(cmd)) {
          seen.add(cmd)
          out.push(cmd)
        }
      }
    }
    const picked = out.slice(-Math.max(10, Math.min(limit, 2000)))
    return { imported: picked.length, commands: picked }
  }

  return {
    zipFiles,
    showSaveDialogForBundle,
    safeSend,
    importShellHistory,
  }
}
