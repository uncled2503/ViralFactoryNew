/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './dbClient';
import { StorageFolder, StorageFile } from '../types';
import { StorageFolderModel, UploadedVideoModel, RenderedVideoModel } from './schema';

export class StorageService {
  private static FOLDERS_TABLE = 'storage_folders';
  private static UPLOADS_TABLE = 'uploaded_videos';
  private static RENDERED_TABLE = 'rendered_videos';

  /**
   * Fetches all storage folders and nested file models for a user
   */
  static async getFolders(userId: string): Promise<StorageFolder[] | null> {
    try {
      const data = await db.findMany<StorageFolderModel>(this.FOLDERS_TABLE, { user_id: userId });
      if (!data || data.length === 0) return null;

      return data.map(folder => ({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        description: folder.description || '',
        files: folder.files || [],
      }));
    } catch (err) {
      console.error('StorageService.getFolders failed:', err);
      return null;
    }
  }

  /**
   * Saves folder tree configurations for quick cataloging
   */
  static async upsertFolders(userId: string, folders: StorageFolder[]): Promise<boolean> {
    try {
      let allOk = true;
      for (const folder of folders) {
        const modelData: StorageFolderModel = {
          id: folder.id,
          user_id: userId,
          name: folder.name,
          path: folder.path,
          description: folder.description,
          files: folder.files || [],
        };
        const result = await db.upsert<StorageFolderModel>(this.FOLDERS_TABLE, modelData, ['id']);
        if (!result) allOk = false;
      }
      return allOk;
    } catch (err) {
      console.error('StorageService.upsertFolders failed:', err);
      return false;
    }
  }

  /**
   * Logs an uploaded raw asset to the persistence layer (UploadedVideos support)
   */
  static async saveUploadedVideo(userId: string, file: StorageFile): Promise<boolean> {
    try {
      const sizeNum = parseFloat(file.size.replace(/[^0-9.]/g, '')) || 0;
      const modelData: UploadedVideoModel = {
        id: file.id,
        user_id: userId,
        name: file.name,
        size_mb: sizeNum,
        url: file.url,
      };
      const result = await db.insert<UploadedVideoModel>(this.UPLOADS_TABLE, modelData);
      return !!result;
    } catch (err) {
      console.warn('Uploaded videos log table offline/missing:', err);
      return false;
    }
  }

  /**
   * Logs a generated/rendered mp4 production to the database (RenderedVideos support)
   */
  static async saveRenderedVideo(userId: string, projectId: string, file: StorageFile): Promise<boolean> {
    try {
      const sizeNum = parseFloat(file.size.replace(/[^0-9.]/g, '')) || 0;
      const modelData: RenderedVideoModel = {
        id: file.id,
        user_id: userId,
        project_id: projectId,
        name: file.name,
        size_mb: sizeNum,
        url: file.url,
      };
      const result = await db.insert<RenderedVideoModel>(this.RENDERED_TABLE, modelData);
      return !!result;
    } catch (err) {
      console.warn('Rendered videos log table offline/missing:', err);
      return false;
    }
  }
}
