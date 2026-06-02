# v1.6.0-beta Safe Patch Agent Validation

## Scope

Validate the Safe TypeScript Patch Agent trust loop only:

- inspect
- propose patch
- diff preview
- approval gate
- apply approved patch
- verification rerun
- rollback on failed verification
- summary

Do not validate unrelated agent workflows in this pass.

## Intentional TypeScript Failure Example

In a disposable test repo, create this minimal failure:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext"
  }
}
```

Use a package script that runs TypeScript:

```json
// package.json
{
  "name": "safe-patch-demo",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

The expected diagnostic is:

```text
tsconfig.json: error TS5109: Option 'moduleResolution' must be set to 'NodeNext'.
```

## Prompt To Use

```text
Fix the TypeScript error in this repo.
```

## Expected Approval Flow

1. Rina runs read-only inspection first.
2. Rina explains the TypeScript failure in plain English.
3. Rina shows the failing file and line number when available.
4. Rina proposes one minimal patch.
5. The patch panel shows:
   - `No files have been modified yet.`
   - file name
   - risk level
   - rollback notes
   - verification command
   - readable red/green diff
   - `Approve Patch`
   - `Deny`
   - `View Full Diff`
6. No file changes before approval.
7. After approval, Rina shows `Applying approved patch...`.
8. Rina reruns verification.
9. Rina reports passed, failed, or partial recovery based on actual verification output.

## Stale Diff Test

1. Trigger a patch proposal.
2. Before approval, manually edit the target file.
3. Click `Approve Patch`.

Expected:

- Rina blocks apply.
- Rina explains the file changed after the diff was generated.
- Rina requires regeneration.
- The stale patch is not applied.

## Deny Test

1. Trigger a patch proposal.
2. Click `Deny`.

Expected:

- Rina reports no file mutation occurred.
- Target file content is byte-for-byte unchanged.
- No backup is created because no apply was attempted.

## Rollback Test

1. Trigger a patch proposal.
2. Make verification fail after patch application, for example by adding a second TypeScript error.
3. Click `Approve Patch`.

Expected:

- Rina creates a backup before applying the patch.
- Rina applies the approved patch.
- Rina reruns verification.
- Rina reports verification failure.
- Rina restores the target file from the backup.
- The backup remains under `.rinawarp/patch-backups/`.

## Verification Expectations

Run:

```bash
node test/rina-agent-safe-patch.test.mjs
npm --workspace apps/terminal-pro run test:rina-runtime
npm --workspace packages/rina-doctor run test:trust
pnpm build
pnpm dist
```

Expected:

- safe patch tests pass
- runtime trust loop tests pass
- doctor trust tests pass
- build completes
- dist completes

Do not commit, tag, or publish from this validation.
