/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { StorageFile } from '../types';

/**
 * Fetches every file's bytes client-side and bundles them into a single .zip download —
 * no backend endpoint needed, since the files already live at public/signed URLs.
 */
export async function downloadFolderAsZip(folderName: string, files: StorageFile[]): Promise<void> {
  if (files.length === 0) return;

  const zip = new JSZip();
  const usedNames = new Set<string>();

  await Promise.all(
    files.map(async (file) => {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();

        let name = file.name || 'arquivo';
        if (usedNames.has(name)) {
          const dot = name.lastIndexOf('.');
          const base = dot > 0 ? name.slice(0, dot) : name;
          const ext = dot > 0 ? name.slice(dot) : '';
          name = `${base}-${file.id.slice(0, 6)}${ext}`;
        }
        usedNames.add(name);

        zip.file(name, blob);
      } catch (err) {
        console.warn(`[downloadFolderAsZip] Failed to fetch ${file.name}:`, err);
      }
    })
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${folderName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'pasta'}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
