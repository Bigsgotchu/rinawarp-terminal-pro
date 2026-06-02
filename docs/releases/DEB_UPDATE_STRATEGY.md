# Debian Update Strategy

RinaWarp currently supports two different Linux truths:

- `AppImage`: in-app updater path
- `.deb`: easiest Debian/Ubuntu install path

If we want **true `.deb` updates** instead of manual website downloads, the right long-term model is not to force `electron-updater` onto `.deb`. The right model is to publish RinaWarp through a real APT repository and let Debian/Ubuntu update it through their package tools.

## Recommended Direction

Use an **APT repository** as the canonical `.deb` update channel.

That means:

1. publish each `.deb` into a structured repository
2. generate `Packages`, `Release`, and `InRelease` metadata
3. sign the repository with a dedicated GPG key
4. give users one install step to add the repo
5. let `apt update && apt upgrade` handle future updates

## Why This Is Better Than In-App `.deb` Updating

- It matches Debian/Ubuntu expectations.
- It keeps system package ownership with APT.
- It avoids two different update authorities fighting each other.
- It gives users cleaner OS-level upgrades and rollbacks.

## Good Release Model

### AppImage

- Use for users who want RinaWarp-managed in-app updates.
- Keep `electron-updater` as the update authority.

### `.deb`

- Use for users who want the cleanest Debian/Ubuntu install.
- Let APT be the update authority.

## What We Need To Build

- dedicated APT repo origin, such as `apt.rinawarptech.com`
- repo generation pipeline
- GPG signing key for repository metadata
- installation instructions:
  - add keyring
  - add source list
  - install package
- release pipeline step to push `.deb` into the repo and refresh metadata

## Release Rule

Until the APT repository exists, the honest statement is:

> `.deb` is the easiest Debian/Ubuntu install path, but updates are manual.`

Once the APT repository is live, the honest statement becomes:

> `.deb` installs update through APT, and AppImage installs update in-app.`
