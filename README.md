# PrintManager

An offline-first printing business management desktop application.

## Current development slice

This repository currently contains the React and TypeScript interface foundation. The first screen is a desktop-focused operational dashboard with local-backup and offline status indicators.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

## Production target

- Tauri Windows desktop application
- Local SQLite database as the primary data source
- Local files for artwork and generated documents
- Encrypted, optional online backup
- No internet dependency for normal business operations

The Tauri and SQLite application layer will be added after the initial workflow and visual structure are validated.
