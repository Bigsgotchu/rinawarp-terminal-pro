# Safety Contract

This file documents the safety contract for automated file mutations and patch application.

Clauses:

1. No mutation before explicit approval: planning phases must not modify workspace files.
2. All writes are backed up: any file that will be modified must have a pre-change backup created.
3. Backups are immutable snapshots: backup content must exactly match the pre-change file.
4. Patches are reversible: a generated patch must be replayable against a clean copy of the repository.
5. Failures are diagnosable: on failure the system leaves a clear diagnostic bundle and does not leave half-written files.

Each automated change must have tests that map to at least one of these clauses.

Test Mapping
------------

This section maps the test suites and individual tests to the clauses above so every safety requirement has explicit coverage.

- `tests/run-safety-tests.js`
	- backup integrity assertions -> Clause 2, 3
	- filesystem snapshot invariant checks -> Clause 1
	- invalid diff failure test -> Clause 4, 5
	- patch replay test -> Clause 4
	- structured diff validation -> Clause 4

- `tests/chaos-tests.js`
	- file-deleted-before-patch -> Clause 2, 5
	- file-readonly-before-patch -> Clause 2, 5
	- dir-disappears-before-patch -> Clause 2, 5
	- backup-count-per-patch -> Clause 2
	- no-temp-artifacts-after-failure -> Clause 5
	- truncated-diff-parse-fails -> Clause 4
	- wrong-file-header-preimage-fails -> Clause 4, 5
	- truncated-header-parse-fails -> Clause 4
	- write-succeeds-verification-fails-rollback -> Clause 3, 5
	- backup-succeeds-patch-fails -> Clause 2, 5
	- patch-succeeds-rollback-broken -> Clause 3, 5
	- two-patches-seq-backups -> Clause 2, 5
	- overlapping-backup-creation -> Clause 2

- `tests/failure-mode-tests.js`
	- permission-failure -> Clause 2, 5
	- file-disappears-mid-patch -> Clause 2, 5
	- partial-write-simulation -> Clause 3, 5
	- structurally-valid-wrong-context -> Clause 4
	- concurrent-patches-sequential -> Clause 2, 5
	- verification-failure-after-patch -> Clause 3, 5

Add new tests under `tests/` and update this mapping when introducing additional clauses or tests.
