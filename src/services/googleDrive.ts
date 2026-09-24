import { ExpiryItem, NotificationSettings, UserProfile } from '../types';

export interface DriveBackupInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

const BACKUP_FILE_NAME = 'ExpiTrack_Vault_Backup.json';

/**
 * Searches for existing ExpiTrack backup files in the user's Google Drive.
 */
export const findDriveBackups = async (token: string): Promise<DriveBackupInfo[]> => {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Uploads or updates the ExpiTrack vault data in Google Drive.
 */
export const uploadVaultToDrive = async (
  items: ExpiryItem[],
  settings: NotificationSettings,
  profile: UserProfile,
  token: string
): Promise<DriveBackupInfo> => {
  const existingFiles = await findDriveBackups(token);
  const existingFile = existingFiles[0];

  const backupData = {
    app: 'ExpiTrack',
    version: '2.4.1',
    backedUpAt: new Date().toISOString(),
    vaultName: profile.vaultName,
    owner: {
      name: profile.name,
      email: profile.email,
    },
    itemCount: items.length,
    items,
    notificationSettings: settings,
  };

  const fileContent = JSON.stringify(backupData, null, 2);

  if (existingFile) {
    // Update existing file content in Google Drive
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to update Drive backup (${res.status}): ${errText}`);
    }

    const updated = await res.json();
    return {
      id: existingFile.id,
      name: existingFile.name,
      modifiedTime: new Date().toISOString(),
      size: `${Math.round(fileContent.length / 1024)} KB`,
      webViewLink: updated.webViewLink || existingFile.webViewLink,
    };
  } else {
    // Create new file via multipart upload
    const metadata = {
      name: BACKUP_FILE_NAME,
      mimeType: 'application/json',
      description: 'Encrypted ExpiTrack Vault data and proof records backup',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create Drive backup (${res.status}): ${errText}`);
    }

    return await res.json();
  }
};

/**
 * Downloads and parses vault backup from Google Drive.
 */
export const downloadVaultFromDrive = async (
  fileId: string,
  token: string
): Promise<{
  items: ExpiryItem[];
  notificationSettings?: NotificationSettings;
  vaultName?: string;
  backedUpAt?: string;
}> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download backup from Drive (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.items)) {
    throw new Error('Downloaded file is not a valid ExpiTrack backup structure');
  }

  return {
    items: data.items,
    notificationSettings: data.notificationSettings,
    vaultName: data.vaultName,
    backedUpAt: data.backedUpAt,
  };
};
