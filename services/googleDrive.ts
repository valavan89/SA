/**
 * Google Drive API Service Helpers
 */

/**
 * Find or create a specific folder in Google Drive
 */
export const getOrCreateFolder = async (token: string, folderName: string): Promise<string> => {
  try {
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }
    
    // Not found, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create Google Drive folder: ${errText}`);
    }
    
    const createData = await createRes.json();
    return createData.id;
  } catch (error) {
    console.error("getOrCreateFolder error:", error);
    throw error;
  }
};

/**
 * Upload a file to Google Drive (creates new file)
 */
export const uploadFileToGoogleDrive = async (
  token: string,
  fileName: string,
  mimeType: string,
  blob: Blob,
  folderId?: string
): Promise<{ id: string; name: string }> => {
  const metadata = {
    name: fileName,
    mimeType: mimeType || blob.type || 'application/octet-stream',
    parents: folderId ? [folderId] : undefined,
  };

  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  // Read blob as base64
  const reader = new FileReader();
  const fileDataPromise = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resolve(btoa(binary));
    };
    reader.onerror = reject;
  });
  reader.readAsArrayBuffer(blob);
  const base64Data = await fileDataPromise;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${metadata.mimeType}\r\n` +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    close_delim;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive upload failed: ${errText || response.statusText}`);
  }

  return await response.json();
};

/**
 * List backup files in the folder
 */
export const listBackupFiles = async (
  token: string,
  folderId: string
): Promise<Array<{ id: string; name: string; createdTime: string }>> => {
  try {
    const q = `'${folderId}' in parents and trashed = false and mimeType = 'application/json'`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&fields=files(id,name,createdTime)`;
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to list Drive files: ${errText}`);
    }
    
    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error("listBackupFiles error:", error);
    throw error;
  }
};

/**
 * Download a file's content
 */
export const downloadFileContent = async (token: string, fileId: string): Promise<string> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to download file from Google Drive: ${errText}`);
    }
    
    return await res.text();
  } catch (error) {
    console.error("downloadFileContent error:", error);
    throw error;
  }
};
