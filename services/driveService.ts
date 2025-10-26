import { CameraInfo, Collection, LensInfo } from '../types';

declare global {
  const gapi: any;
}

const APP_FOLDER_NAME = 'CameraCollectorAI_Data';
const COLLECTION_FILE_NAME = 'cameracollection.json';
let appFolderId: string | null = null;

export const init = (token: any) => {
  return new Promise<void>((resolve, reject) => {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          // NOTE: API key is not required for Drive API when using OAuth
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        gapi.client.setToken(token);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

const getAppFolderId = async (): Promise<string> => {
    if (appFolderId) {
        return appFolderId;
    }

    try {
        const response = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
            fields: 'files(id, name)',
        });

        if (response.result.files && response.result.files.length > 0) {
            appFolderId = response.result.files[0].id;
            return appFolderId!;
        } else {
            const fileMetadata = {
                name: APP_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            };
            const folderResponse = await gapi.client.drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            appFolderId = folderResponse.result.id;
            return appFolderId!;
        }
    } catch (error) {
        console.error("Error getting/creating app folder", error);
        throw new Error("Could not access the app folder in Google Drive.");
    }
};

export const uploadImage = async (base64Data: string, fileName: string): Promise<string> => {
    const folderId = await getAppFolderId();
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = 'image/jpeg';

    const metadata = {
        name: fileName,
        mimeType: contentType,
        parents: [folderId],
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        base64Data +
        close_delim;

    const request = gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"',
        },
        body: multipartRequestBody,
    });

    try {
        const response = await request;
        if (response && response.result && response.result.id) {
            return response.result.id;
        } else {
            // This case might happen if the response is 200 but malformed
            console.error("Image upload response was successful but missing file ID.", response);
            throw new Error("Image upload response was successful but missing file ID.");
        }
    } catch (reason) {
        console.error("Error uploading image to Google Drive:", reason);
        // Handle cases where GAPI promise rejects with a success-like object
        const result = (reason as any)?.result;
        if (result && result.id) {
             console.warn("Caught a successful-looking response in the error block. Recovering.", reason);
             return result.id;
        }
        throw new Error("Failed to upload image to Google Drive.");
    }
};

export const deleteFile = (fileId: string): Promise<void> => {
    return gapi.client.drive.files.delete({ fileId });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getImageBlobUrl = async (fileId: string): Promise<string> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;
    const accessToken = gapi.client.getToken().access_token;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                 const errorBody = await response.json().catch(() => ({ message: response.statusText }));
                 throw new Error(`Google Drive API responded with status ${response.status}: ${errorBody.error?.message || response.statusText}`);
            }
            
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error(`Error fetching image ${fileId} (attempt ${attempt}):`, error);
            if (attempt === MAX_RETRIES) {
                throw new Error("Could not fetch image from Google Drive after multiple attempts.");
            }
            // Wait before retrying, with increasing delay
            await sleep(RETRY_DELAY_MS * attempt);
        }
    }
    // This line should be unreachable if MAX_RETRIES > 0, but is here for type safety
    throw new Error("Could not fetch image from Google Drive.");
};


export const getFileAsBase64 = async (fileId: string): Promise<string> => {
    const accessToken = gapi.client.getToken().access_token;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch file ${fileId} from Google Drive.`);
    }

    const blob = await response.blob();

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => {
            // result is "data:image/jpeg;base64,...."
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


const getCollectionFileId = async (folderId: string): Promise<string | null> => {
    const response = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and name='${COLLECTION_FILE_NAME}' and trashed=false`,
        fields: 'files(id)',
    });
    return response.result.files && response.result.files.length > 0 ? response.result.files[0].id : null;
};

export const saveCollection = async (collection: Collection): Promise<void> => {
    const folderId = await getAppFolderId();
    const fileId = await getCollectionFileId(folderId);
    const content = JSON.stringify(collection, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    const form = new FormData();
    if (fileId) {
        // Update existing file
        form.append('metadata', new Blob([JSON.stringify({ name: COLLECTION_FILE_NAME })], { type: 'application/json' }));
        form.append('file', blob);

        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${gapi.client.getToken().access_token}` },
            body: form
        });
    } else {
        // Create new file
        form.append('metadata', new Blob([JSON.stringify({ name: COLLECTION_FILE_NAME, parents: [folderId] })], { type: 'application/json' }));
        form.append('file', blob);

        await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${gapi.client.getToken().access_token}` },
            body: form
        });
    }
};

export const loadCollection = async (): Promise<Collection> => {
    const folderId = await getAppFolderId();
    const fileId = await getCollectionFileId(folderId);

    if (!fileId) {
        return { cameras: [], lenses: [] }; // No collection file yet, return empty collection
    }
    
    const accessToken = gapi.client.getToken().access_token;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    
    if (!response.ok) {
        throw new Error("Failed to load collection file from Google Drive.");
    }

    const data = await response.json();

    // Backwards compatibility for old format (array of cameras)
    if (Array.isArray(data)) {
        return { cameras: data, lenses: [] };
    }

    return { cameras: data.cameras || [], lenses: data.lenses || [] };
};
