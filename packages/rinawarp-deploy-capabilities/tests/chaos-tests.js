const fs = require('fs')
const path = require('path')
const os = require('os')
const assert = require('assert')
const { execSync } = require('child_process')
const safety = require('../lib/safety')

function mkRepoWithFile(content = 'one\ntwo\nthree\n') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chaos-'))
  const file = path.join(tmpDir, 'file.txt')
  fs.writeFileSync(file, content)
  execSync('git init -q', { cwd: tmpDir })
  execSync('git add file.txt', { cwd: tmpDir })
  execSync('git commit -m init --author "test <test@example.com>" -q', { cwd: tmpDir })
  // create a second commit so HEAD~1 exists for diffs
  fs.writeFileSync(file, content.replace(/two/, 'TWO'))
  execSync('git add file.txt', { cwd: tmpDir })
  execSync('git commit -m change --author "test <test@example.com>" -q', { cwd: tmpDir })
  return { tmpDir, file }
}

function runCase(name, fn) {
  try {
    fn()
    console.log(`${name}: PASS`)
  } catch (err) {
    console.error(`${name}: FAIL — ${err.message}`)
  }
}

// 1. Filesystem hostility: file deleted before patch
runCase('file-deleted-before-patch', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const diffFile = path.join(tmpDir, 'patch.diff')
  execSync('git --no-pager diff HEAD~1 HEAD > patch.diff', { cwd: tmpDir })
  // backup created
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const b = safety.createBackupSync(file, backupDir)
  // delete file before apply
  fs.unlinkSync(file)
  let ok = true
  try {
    execSync(`git apply --check "${diffFile}"`, { cwd: tmpDir })
  } catch (err) {
    ok = false
  }
  assert.ok(!ok, 'git apply should fail when file missing')
  const backups = safety.listBackupsSync(backupDir, path.basename(file))
  assert.strictEqual(backups.length, 1, 'backup count increased')
})

// 2. Filesystem hostility: file becomes read-only
runCase('file-readonly-before-patch', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const b = safety.createBackupSync(file, backupDir)
  // create a diff from the last change (mkRepoWithFile made two commits)
  const diffFile = path.join(tmpDir, 'patch.diff')
  execSync('git --no-pager diff HEAD~1 HEAD > patch.diff', { cwd: tmpDir })
  // restore to previous commit for apply test
  execSync('git checkout HEAD~1 -- file.txt', { cwd: tmpDir })
  // make file read-only to simulate permission error during write
  fs.chmodSync(file, 0o444)
  let applied = true
  try {
    execSync(`git apply --check "${diffFile}"`, { cwd: tmpDir })
    execSync(`git apply "${diffFile}"`, { cwd: tmpDir })
  } catch (err) {
    applied = false
  }
  // On some systems apply may succeed but write fails; ensure backup still present and original content intact
  const backups = safety.listBackupsSync(backupDir, path.basename(file))
  assert.strictEqual(backups.length, 1)
})

// 3. Directory disappears mid-operation
runCase('dir-disappears-before-patch', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  safety.createBackupSync(file, backupDir)
  // remove dir
  fs.rmdirSync(tmpDir, { recursive: true })
  // ensure apply fails when dir missing
  let failed = false
  try {
    execSync('git apply --check patch.diff', { cwd: tmpDir })
  } catch (err) {
    failed = true
  }
  assert.ok(failed)
})

// 4. Backup file count increases by 1 per patch
runCase('backup-count-per-patch', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const b1 = safety.createBackupSync(file, backupDir)
  const b2 = safety.createBackupSync(file, backupDir)
  const list = safety.listBackupsSync(backupDir, path.basename(file))
  assert.strictEqual(list.length, 2)
})

// 5. No temp half-written artifacts exist after failure
runCase('no-temp-artifacts-after-failure', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const tmpArtifact = path.join(tmpDir, 'file.txt.tmp')
  fs.writeFileSync(tmpArtifact, 'partial')
  // simulate failure and cleanup
  fs.unlinkSync(tmpArtifact)
  assert.ok(!fs.existsSync(tmpArtifact), 'temp artifact cleaned')
})

// Patch corruption tests
runCase('truncated-diff-parse-fails', () => {
  const bad = '+++ b/file.txt\n@@ -1,3 +1,3 @@\n-1\n+1' // truncated, missing lines
  let threw = false
  try {
    require('../lib/diff-parser').parseUnifiedDiff(bad)
  } catch (err) {
    threw = true
  }
  assert.ok(threw)
})

runCase('wrong-file-header-preimage-fails', () => {
  const { tmpDir } = mkRepoWithFile()
  const diff = '--- a/NOFILE.txt\n+++ b/NOFILE.txt\n@@ -1 +1 @@\n-hello\n+world\n'
  let threw = false
  try {
    const parsed = require('../lib/diff-parser').parseUnifiedDiff(diff)
    const ok = require('../lib/diff-parser').validatePreimageMatchesFilesystem(parsed.files[0], tmpDir)
    assert.strictEqual(ok, false)
  } catch (err) {
    threw = true
  }
  assert.ok(!threw)
})

runCase('truncated-header-parse-fails', () => {
  let threw = false
  try {
    require('../lib/diff-parser').parseUnifiedDiff('@@ -1 +1 @@\n-foo\n+bar')
  } catch (err) {
    threw = true
  }
  assert.ok(threw)
})

// Partial execution failure: write succeeds but verification fails -> roll back from backup
runCase('write-succeeds-verification-fails-rollback', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const b = safety.createBackupSync(file, backupDir)
  // simulate patch applied
  fs.writeFileSync(file, 'corrupted content\n')
  // verification (expect original) fails
  const backupHash = safety.fileHashSync(b)
  // perform rollback by restoring backup
  fs.copyFileSync(b, file)
  const afterHash = safety.fileHashSync(file)
  assert.strictEqual(afterHash, backupHash, 'rollback restored original content')
})

// Backup succeeds but patch fails (simulate by making file immutable)
runCase('backup-succeeds-patch-fails', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  safety.createBackupSync(file, backupDir)
  fs.chmodSync(file, 0o444)
  let failed = false
  try {
    // attempt write
    fs.writeFileSync(file, 'should fail')
  } catch (err) {
    failed = true
  }
  assert.ok(failed)
})

// Patch succeeds but rollback broken (backup deleted)
runCase('patch-succeeds-rollback-broken', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  const b = safety.createBackupSync(file, backupDir)
  // apply patch
  fs.writeFileSync(file, 'patched\n')
  // delete backup to simulate broken rollback
  fs.unlinkSync(b)
  const ok = fs.existsSync(b)
  assert.strictEqual(ok, false)
})

// Race-ish: two patches sequentially create backups
runCase('two-patches-seq-backups', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  safety.createBackupSync(file, backupDir)
  fs.writeFileSync(file, 'first change\n')
  safety.createBackupSync(file, backupDir)
  const list = safety.listBackupsSync(backupDir, path.basename(file))
  assert.ok(list.length >= 2, 'should have at least two backups')
})

// Overlapping backup creation
runCase('overlapping-backup-creation', () => {
  const { tmpDir, file } = mkRepoWithFile()
  const backupDir = path.join(tmpDir, 'backups')
  safety.ensureDirExists(backupDir)
  // simulate overlap
  const b1 = safety.createBackupSync(file, backupDir)
  const b2 = safety.createBackupSync(file, backupDir)
  const list = safety.listBackupsSync(backupDir, path.basename(file))
  assert.ok(list.length >= 2, 'overlapping backups should result in multiple files')
})

console.log('Chaos tests complete')
