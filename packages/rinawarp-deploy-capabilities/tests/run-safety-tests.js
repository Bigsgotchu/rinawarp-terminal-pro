const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')
const safety = require('../lib/safety')
const diffParser = require('../lib/diff-parser')

function mkTempFile(prefix, content) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  const file = path.join(tmpDir, 'file.txt')
  fs.writeFileSync(file, content)
  return { tmpDir, file }
}

function testBackupIntegrity() {
  const { tmpDir, file } = mkTempFile('safety-test-', 'original-content')
  const backupDir = path.join(tmpDir, 'backups')
  const before = safety.snapshotFilesSync([file])
  // create backup
  const bpath = safety.createBackupSync(file, backupDir)
  assert.ok(fs.existsSync(backupDir), 'backup dir exists')
  const backups = safety.listBackupsSync(backupDir, path.basename(file))
  assert.strictEqual(backups.length, 1, 'one backup created')
  assert.ok(safety.verifyBackupMatchesSync(file, bpath), 'backup matches original')
  console.log('testBackupIntegrity passed')
}

function testSnapshotInvariant() {
  const { tmpDir, file } = mkTempFile('safety-test-', 'unchanged')
  const before = safety.snapshotFilesSync([file])
  // no-op
  const after = safety.snapshotFilesSync([file])
  assert.deepStrictEqual(before[file], after[file], 'snapshot unchanged')
  console.log('testSnapshotInvariant passed')
}

function testInvalidDiff() {
  const bad = 'this is not a diff'
  let threw = false
  try {
    safety.parseUnifiedDiff(bad)
  } catch (err) {
    threw = true
  }
  assert.ok(threw, 'invalid diff should throw')
  console.log('testInvalidDiff passed')
}

async function testPatchReplay() {
  const { tmpDir, file } = mkTempFile('safety-patch-', 'hello\n')
  const diff = '--- a/file.txt\n+++ b/file.txt\n@@ -1,1 +1,1 @@\n-hello\n+hello world\n'
  const result = await safety.applyPatchReplay(diff, { repoRoot: tmpDir })

  assert.strictEqual(result.ok, true)
  assert.strictEqual(fs.readFileSync(file, 'utf8'), 'hello world\n')
  console.log('testPatchReplay passed')
}

function testUpgradeDiffValidation() {
  const { tmpDir, file } = mkTempFile('safety-diff-', 'line1\nline2\nline3\n')
  const diff = '--- a/file.txt\n+++ b/file.txt\n@@ -1,3 +1,3 @@\n line1\n-line2\n+LINE2-CHANGED\n line3\n'
  const parsed = diffParser.parseUnifiedDiff(diff)
  if (!parsed || !parsed.files || parsed.files.length === 0) throw new Error('diff parse failed')
  const valid = diffParser.validatePreimageMatchesFilesystem(parsed.files[0], tmpDir)
  if (!valid) throw new Error('pre-image did not match filesystem')
  fs.writeFileSync(file, 'line1\nunexpected\nline3\n')
  const stale = diffParser.validatePreimageMatchesFilesystem(parsed.files[0], tmpDir)
  assert.strictEqual(stale, false, 'stale pre-image must be rejected')
  console.log('testUpgradeDiffValidation passed')
}

async function run() {
  testBackupIntegrity()
  testSnapshotInvariant()
  testInvalidDiff()
  await testPatchReplay()
  testUpgradeDiffValidation()
  console.log('All safety tests complete')
}

run().catch((e) => {
  console.error('safety tests failed', e)
  process.exit(1)
})
