/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { authenticatedFetch } from './api';

// Uploads a real file to the backend (signed URL + PUT), reporting real progress.
// Shared by every screen that lets a user upload an actual file (project wizard,
// storage manager) so there's one real upload path instead of several near-copies.
export const uploadFileToServer = (file: File, onProgress?: (pct: number) => void): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${file.name}`.replace(/\s+/g, '_');
      const signedRes = await authenticatedFetch(
        `/api/render/signed-upload-url?folder=uploads&filename=${encodeURIComponent(uniqueName)}&contentType=${encodeURIComponent(file.type || 'application/octet-stream')}`
      );
      if (!signedRes.ok) {
        const errBody = await signedRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Falha ao solicitar URL de upload');
      }
      const { uploadUrl, assetUrl } = await signedRes.json();

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(assetUrl);
        } else {
          reject(new Error(`Upload falhou com status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Falha de rede durante o upload'));
      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
};
