# Production Decision Rule

Do not call v1.8.2 full production until all of this is true:

- [ ] Linux artifacts validated
- [ ] macOS signed and notarized
- [ ] Windows signed
- [ ] First-run onboarding validated
- [ ] Beta testers generated first proof
- [ ] Proof export works for testers
- [ ] Safe fix approval understood by testers
- [ ] Billing/auth/license hardened
- [ ] Support path exists
- [ ] Docs are complete
- [ ] Telemetry confirms activation

## Release Labels

Before signing:

Cross-platform unsigned beta

After signing and beta validation:

Full production release

## Full Production Blockers

- macOS unsigned or not notarized
- Windows unsigned
- Linux artifacts not verified
- Missing first-run path to first proof
- Missing support or diagnostic path
- Telemetry includes secrets, tokens, raw file contents, raw command output, or unredacted private paths

