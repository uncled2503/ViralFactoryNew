/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './dbClient';
import { Template } from '../types';
import { TemplateModel } from './schema';
import { safeUUID, safeUUIDNullable } from '../utils/uuid';

export class TemplateService {
  private static TABLE = 'templates';

  /**
   * Fetches all public templates and custom templates created by the user
   */
  static async getTemplates(userId: string): Promise<Template[] | null> {
    try {
      const validUserId = safeUUID(userId);
      // Fetch user's templates
      const userTemplates = await db.findMany<TemplateModel>(
        this.TABLE,
        { user_id: validUserId },
        { orderBy: 'created_at', orderAsc: false }
      );

      // Fetch public templates
      const publicTemplates = await db.findMany<TemplateModel>(
        this.TABLE,
        { is_public: true },
        { orderBy: 'created_at', orderAsc: false }
      );

      const uniqueTemplatesMap = new Map<string, TemplateModel>();
      [...publicTemplates, ...userTemplates].forEach(t => {
        uniqueTemplatesMap.set(t.id, t);
      });

      const merged = Array.from(uniqueTemplatesMap.values());

      return merged.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        aspect: t.aspect as any,
        createdAt: t.created_at || new Date().toISOString(),
        updatedAt: t.updated_at || new Date().toISOString(),
        bgMusicUrl: t.bg_music_url || undefined,
        defaultDuration: t.default_duration,
        scenesCount: t.scenes_count,
        layers: t.layers || [],
      }));
    } catch (err) {
      console.error('TemplateService.getTemplates failed:', err);
      return null;
    }
  }

  /**
   * Inserts or updates a layout template
   */
  static async upsertTemplate(userId: string, template: Template): Promise<boolean> {
    try {
      const validTemplateId = safeUUID(template.id);
      const validUserId = safeUUID(userId);

      const modelData: TemplateModel = {
        id: validTemplateId,
        user_id: validUserId,
        name: template.name || 'Untitled Template',
        description: template.description || '',
        aspect: template.aspect || '16:9',
        aspect_ratio: template.aspect || '16:9',
        bg_music_url: template.bgMusicUrl || undefined,
        default_duration: template.defaultDuration || 30,
        duration_seconds: template.defaultDuration || 30,
        scenes_count: template.scenesCount || 1,
        layers: template.layers || [],
        is_public: false,
        updated_at: new Date().toISOString(),
      };

      if (template.createdAt) {
        modelData.created_at = template.createdAt;
      }

      const result = await db.upsert<TemplateModel>(this.TABLE, modelData, ['id']);
      return !!result;
    } catch (err) {
      console.error('TemplateService.upsertTemplate failed:', err);
      return false;
    }
  }

  /**
   * Deletes a layout template by ID
   */
  static async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      return await db.delete(this.TABLE, { id: templateId });
    } catch (err) {
      console.error('TemplateService.deleteTemplate failed:', err);
      return false;
    }
  }
}
