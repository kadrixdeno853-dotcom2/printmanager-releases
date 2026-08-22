# Publishing PrintManager updates with GitHub

Update repository: `https://github.com/kadrixdeno853-dotcom2/printmanager-releases`

## One-time GitHub setup

The signing files are stored outside this repository in `Documents\PrintManager Signing Keys`. Back up that folder securely. Losing the private key or its password prevents already-installed copies from accepting future updates.

In the GitHub repository, open **Settings → Secrets and variables → Actions** and create:

- `TAURI_SIGNING_PRIVATE_KEY`: the complete contents of `printmanager.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the complete contents of `signing-password.txt`

Never commit either value. The `.gitignore` excludes signing keys as an additional safeguard.

## Publish an update

1. Increase the version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
2. Commit the tested changes.
3. Push them to the `release` branch, or run **Publish PrintManager update** from the GitHub Actions tab.
4. GitHub builds the Windows installer, signs its updater artifact, creates a release, and publishes `latest.json`.
5. Installed computers check the GitHub release when internet is available. A visible prompt lets the user back up, download, install, and restart.

Offline work is unaffected when GitHub or the internet is unavailable.
