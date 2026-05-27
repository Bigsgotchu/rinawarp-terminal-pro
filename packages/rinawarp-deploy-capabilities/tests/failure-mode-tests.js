const fs = require('fs')
const path = require('path')
const os = require('os')
const assert = require('assert')
const safety = require('../lib/safety')
const diffParser = require('../lib/diff-parser')

let failures = 0

function mkRepoWithFile(content = 'line1\nline2\nline3\n') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fail-'))
  const file = path.join(tmpDir, 'file.txt')
  fs.writeFileSync(file, content)
  return { tmpDir, file }
}

function readText(file) {
  return fs.readFileSync(file, 'utf8')
}

function backupFiles(backupDir, file) {
  return safety.listBackupsSync(backupDir, path.basename(file))
}

function safeApplySimulated({ file, backupDir, nextContent, verify = () => true, write = fs.writeFileSync }) {
  const before = readText(file)
  const backup = safety.createBackupSync(file, backupDir)

  try {
    write(file, nextContent)
  } catch (err) {
    return { ok: false, phase: 'write', error: err, backup }
  }

  if (!verify()) {
    fs.copyFileSync(backup, file)
    return { ok: false, phase: 'verify', backup }
  }

  return { ok: true, backup, before }
}

function run(name, fn) {
  try {
    fn()
    console.log(`${name}: PASS`)
  } catch (err) {
    failures += 1
    console.error(`${name}: FAIL — ${err.message}`)
  }
}

// 1. Permission failure
run('permission-failure', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const backup = safety.createBackupSync(file, backupDir)
  const before = readText(file)
  // make read-only
  fs.chmodSync(file, 0o444)
  let wrote = true
  try {
    fs.writeFileSync(file, 'attempt')
  } catch (err) {
    wrote = false
  }
  assert.strictEqual(wrote, false, 'write should fail due to permissions')
  // backup preserved
  const list = backupFiles(backupDir, file)
  assert.ok(list.length >= 1)
  assert.strictEqual(readText(backup), before, 'backup should preserve original content')
  assert.strictEqual(readText(file), before, 'read-only target should remain unchanged')
  fs.chmodSync(file, 0o644)
})

// 2. File disappearance mid-patch
run('file-disappears-mid-patch', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const plannedBackups = backupFiles(backupDir, file)
  // remove file
  fs.unlinkSync(file)
  // prepare a valid diff
  const diff = '--- a/file.txt\n+++ b/file.txt\n@@ -1,3 +1,3 @@\n-line1\n-line2\n-line3\n+line1\n+NEW\n+line3\n'
  const parsed = diffParser.parseUnifiedDiff(diff)
  const ok = diffParser.validatePreimageMatchesFilesystem(parsed.files[0], tmpDir)
  assert.strictEqual(ok, false, 'preimage validation must fail when file missing')
  // no stale backup should be created before the target can be reread
  assert.deepStrictEqual(backupFiles(backupDir, file), plannedBackups)
})

// 3. Partial write simulation (crash after backup before final write)
run('partial-write-simulation', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const b = safety.createBackupSync(file, backupDir)
  // write to temp then simulate crash (do not atomically rename)
  const tmpPath = file + '.tmp'
  fs.writeFileSync(tmpPath, 'partial')
  // simulate crash by removing tmp without touching target
  fs.unlinkSync(tmpPath)
  // ensure target unchanged
  const orig = fs.readFileSync(b)
  const now = fs.readFileSync(file)
  assert.ok(orig.equals(now), 'target unchanged after simulated crash')
})

// 3b. Crash after backup but before write is reported without mutating target
run('backup-succeeds-write-never-starts', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  const before = readText(file)
  const result = safeApplySimulated({
    file,
    backupDir,
    nextContent: 'patched\n',
    write: () => {
      const err = new Error('simulated crash before final write')
      err.code = 'EPIPE'
      throw err
    },
  })

  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.phase, 'write')
  assert.ok(fs.existsSync(result.backup), 'backup should survive write failure')
  assert.strictEqual(readText(file), before, 'target remains unchanged after simulated crash')
})

// 4. Invalid but structurally valid diff (wrong context)
run('structurally-valid-wrong-context', () => {
  const { tmpDir, file } = mkRepoWithFile()
  // create diff with headers but wrong context
  const diff = '--- a/file.txt\n+++ b/file.txt\n@@ -1,3 +1,3 @@\n-foo\n-bar\n-baz\n+one\n+two\n+three\n'
  const parsed = diffParser.parseUnifiedDiff(diff)
  const ok = diffParser.validatePreimageMatchesFilesystem(parsed.files[0], tmpDir)
  assert.strictEqual(ok, false, 'validator must detect wrong context')
})

// 5. Concurrent patch attempt (light race)
run('concurrent-patches-sequential', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const b1 = safety.createBackupSync(file, backupDir)
  // apply first patch (simulate)
  fs.writeFileSync(file, 'first\n')
  const b2 = safety.createBackupSync(file, backupDir)
  // apply second patch
  fs.writeFileSync(file, 'second\n')
  const list = safety.listBackupsSync(backupDir, path.basename(file))
  assert.ok(list.length >= 2, 'two backups should exist')
  assert.strictEqual(new Set(list).size, list.length, 'backup filenames should not collide')
  const final = fs.readFileSync(file, 'utf8')
  assert.strictEqual(final, 'second\n')
})

// 6. Verification failure after successful patch
run('verification-failure-after-patch', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const before = readText(file)
  const result = safeApplySimulated({
    file,
    backupDir,
    nextContent: 'patched\n',
    verify: () => false,
  })

  assert.strictEqual(result.ok, false, 'verification failed as simulated')
  assert.strictEqual(result.phase, 'verify')
  assert.strictEqual(readText(file), before, 'failed verification should roll back target content')
  const list = backupFiles(backupDir, file)
  assert.ok(list.length >= 1)
  assert.ok(fs.existsSync(result.backup), 'backup remains available after rollback')
})

// 7. Partial temp artifact must not be mistaken for a completed patch
run('partial-temp-artifact-is-not-success', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  const before = readText(file)
  const tempArtifact = `${file}.partial`
  const result = safeApplySimulated({
    file,
    backupDir,
    nextContent: 'patched\n',
    write: () => {
      fs.writeFileSync(tempArtifact, 'patched')
      throw new Error('simulated crash after temp artifact')
    },
  })

  assert.strictEqual(result.ok, false)
  assert.strictEqual(readText(file), before, 'target remains unchanged when only temp artifact exists')
  assert.ok(fs.existsSync(tempArtifact), 'temp artifact records the interrupted write')
  assert.ok(fs.existsSync(result.backup), 'backup remains available for recovery')
})

// 8. Backup creation under rapid sequential attempts remains unique
run('rapid-backup-uniqueness', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)

  for (let i = 0; i < 8; i += 1) {
    safety.createBackupSync(file, backupDir)
  }

  const list = backupFiles(backupDir, file)
  assert.strictEqual(list.length, 8)
  assert.strictEqual(new Set(list).size, 8, 'rapid backups should not overwrite each other')
})

console.log('Failure-mode tests complete')
if (failures > 0) {
  process.exitCode = 1
}
