# Artifact Smoke Checklist

## Linux AppImage

```sh
chmod +x RinaWarp-Terminal-Pro-*.AppImage
./RinaWarp-Terminal-Pro-*.AppImage
```

Expected:

- [ ] App launches
- [ ] Workspace selection works
- [ ] Build prompt runs
- [ ] Proof appears
- [ ] Proof export works
- [ ] Quit/reopen persistence works

## Linux deb

```sh
sudo apt install ./RinaWarp-Terminal-Pro-*.deb
```

Launch from the system menu or terminal.

Expected:

- [ ] App installs
- [ ] App launches
- [ ] Workspace selection works
- [ ] Build prompt runs
- [ ] Proof appears
- [ ] Proof export works
- [ ] Quit/reopen persistence works

## macOS DMG or ZIP

Install/open the DMG or ZIP.

Expected unsigned warning:

macOS may block the app because it is unsigned.

Tester bypass:

Right-click app, choose Open, then choose Open again.

Expected:

- [ ] App launches
- [ ] Workspace selection works
- [ ] Build prompt runs
- [ ] Proof appears
- [ ] Proof export works
- [ ] Quit/reopen persistence works

## Windows Installer

Install/open the `.exe`.

Expected SmartScreen warning:

Choose More info, then Run anyway.

Expected:

- [ ] App installs
- [ ] App launches
- [ ] Workspace selection works
- [ ] Build prompt runs
- [ ] Proof appears
- [ ] Proof export works
- [ ] Quit/reopen persistence works

