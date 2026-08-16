/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './dbClient';
import { Project } from '../types';
import { ProjectModel } from './schema';
import { safeUUID, safeUUIDNullable } from '../utils/uuid';

export class ProjectService {
  private static TABLE = 'projects';

  /**
   * Fetches all projects belonging to a user
   */
  static async getProjects(userId: string): Promise<Project[] | null> {
    try {
      const validUserId = safeUUID(userId);
      const data = await db.findMany<ProjectModel>(
        this.TABLE,
        { user_id: validUserId },
        { orderBy: 'created_at', orderAsc: false }
      );

      return data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        templateId: p.template_id || '',
        status: p.status,
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString(),
        aspect: p.aspect as any,
        videoUrl: p.video_url || undefined,
        variables: p.variables || {},
      }));
    } catch (err) {
      console.error('ProjectService.getProjects failed:', err);
      return null;
    }
  }

  /**
   * Inserts or updates a single Project record
   */
  static async upsertProject(userId: string, project: Project): Promise<boolean> {
    try {
      const validProjectId = safeUUID(project.id);
      const validUserId = safeUUID(userId);
      let validTemplateId = safeUUIDNullable(project.templateId);

      // Verify template exists in templates table to avoid foreign key constraint errors
      if (validTemplateId) {
        const existingTemplate = await db.findOne('templates', { id: validTemplateId });
        if (!existingTemplate) {
          validTemplateId = null;
        }
      }

      const modelData: ProjectModel = {
        id: validProjectId,
        user_id: validUserId,
        name: project.name || 'Untitled Project',
        description: project.description || '',
        template_id: validTemplateId || undefined,
        status: project.status || 'draft',
        aspect: project.aspect || '16:9',
        aspect_ratio: project.aspect || '16:9',
        variables: project.variables || {},
        video_url: project.videoUrl || undefined,
        updated_at: new Date().toISOString(),
      };

      if (project.createdAt) {
        modelData.created_at = project.createdAt;
      }

      const result = await db.upsert<ProjectModel>(this.TABLE, modelData, ['id']);
      return !!result;
    } catch (err) {
      console.error('ProjectService.upsertProject failed:', err);
      return false;
    }
  }

  /**
   * Deletes a project by ID
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    try {
      return await db.delete(this.TABLE, { id: projectId });
    } catch (err) {
      console.error('ProjectService.deleteProject failed:', err);
      return false;
    }
  }
}
