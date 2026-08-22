# PrintManager installation and recovery

## Install on the shop computer

1. Copy the `PrintManager_0.1.0_x64-setup.exe` installer to the Windows shop computer.
2. Double-click the installer and approve the Windows prompt.
3. Open PrintManager from the desktop or Start menu.
4. Enter the business details and create the owner account.
5. Keep the owner password in a secure place.
6. Print or securely store the owner recovery code shown during setup. It can reset a forgotten password without deleting business records.

The program and its data do not need internet. Business data is stored under the signed-in Windows user's local application-data folder, separate from the installed program, so application upgrades do not overwrite the database.

## Backups

- PrintManager creates a local backup on startup when the latest one is more than 20 hours old.
- The newest 30 automatic local database backups are retained.
- Open **Backup** to create a manual copy or an AES-256 encrypted archive.
- For online protection, enter a local OneDrive, Google Drive, or Dropbox sync-folder path. The provider's Windows client uploads the encrypted file when internet returns.
- Store the encryption password safely. An encrypted archive cannot be recovered without it.

## Restore

Open **Backup**, select a backup, and choose **Restore**. PrintManager creates another safety copy before replacing the active database, then reloads. Encrypted archives require their original password.

## Forgotten owner password

Choose **Forgot owner password?** on the sign-in screen, then enter the owner username, saved recovery code, and a new password. For an existing installation, sign in once and create a recovery code under **Settings → Owner password recovery**. Generating a replacement code disables the previous one.

## Moving to another computer

Create an encrypted backup on the old computer, copy or synchronize the `.pmbak` file, install PrintManager on the new computer, and restore the archive from the Backup screen. Keep the old computer unchanged until the new installation has been checked.
