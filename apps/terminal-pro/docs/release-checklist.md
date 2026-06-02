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
- [ ] macOS signing configured
- [ ] macOS notarization configured
- [ ] Windows signing configured
- [ ] Linux package metadata verified

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
