# RinaWarp Terminal Pro Release Checklist

## Build
- [ ] Renderer build passes
- [ ] Electron build passes
- [ ] Dist build passes

## Tests
- [ ] Plan-risk tests pass
- [ ] Safe patch tests pass
- [ ] Packaged first-run test passes
- [ ] Safe mutation test passes
- [ ] Production env audit passes

## Signing
- [ ] `verify:signing` passes
- [ ] Local unsigned packaged build still works
- [ ] Release mode fails if signing credentials are missing
- [ ] macOS hardened runtime configured
- [ ] macOS entitlements file exists
- [ ] macOS notarization path configured
- [ ] Windows signing path documented
- [ ] Linux package metadata verified
- [ ] Artifact names are path-safe

## Runtime Safety
- [ ] E2E hooks disabled in production
- [ ] No hardcoded production secrets
- [ ] Preload bridge allowlist verified
- [ ] Marketplace Pro gates verified

## Proof Layer
- [ ] Run block created
- [ ] Receipt generated
- [ ] Receipt export works
- [ ] Receipt persists after restart
