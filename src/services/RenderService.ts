/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './dbClient';
import { RenderingTask } from '../types';
import { RenderJobModel, RenderLogModel } from './schema';

export class RenderService {
  private static JOBS_TABLE = 'rendering_tasks';
  private static LOGS_TABLE = 'rendering_logs'; // decoupled log collection

  /**
   * Fetches all rendering queue tasks for a user
   */
  static async getRenderingTasks(userId: string): Promise<RenderingTask[] | null> {
    try {
      const data = await db.findMany<RenderJobModel>(
        this.JOBS_TABLE,
        { user_id: userId },
        { orderBy: 'created_at', orderAsc: false }
      );

      return data.map(t => ({
        id: t.id,
        projectId: t.project_id || '',
        projectName: t.project_name,
        templateName: t.template_name,
        status: t.status,
        progress: t.progress,
        duration: t.duration,
        renderTime: t.render_time || undefined,
        outputUrl: t.output_url || undefined,
        createdAt: t.created_at || new Date().toISOString(),
        completedAt: t.completed_at || undefined,
      }));
    } catch (err) {
      console.error('RenderService.getRenderingTasks failed:', err);
      return null;
    }
  }

  /**
   * Upserts a single rendering job state
   */
  static async upsertRenderingTask(userId: string, task: RenderingTask): Promise<boolean> {
    try {
      const modelData: RenderJobModel = {
        id: task.id,
        project_id: task.projectId || undefined,
        user_id: userId,
        project_name: task.projectName,
        template_name: task.templateName,
        status: task.status,
        progress: task.progress,
        duration: task.duration,
        render_time: task.renderTime || undefined,
        output_url: task.outputUrl || undefined,
        completed_at: task.completedAt || undefined,
      };

      if (task.createdAt) {
        modelData.created_at = task.createdAt;
      }

      const result = await db.upsert<RenderJobModel>(this.JOBS_TABLE, modelData, ['id']);
      return !!result;
    } catch (err) {
      console.error('RenderService.upsertRenderingTask failed:', err);
      return false;
    }
  }

  /**
   * Creates a structured system render pipeline log for diagnostics (RenderLogs support)
   */
  static async logRenderEvent(
    level: 'info' | 'warning' | 'error' | 'critical',
    service: string,
    message: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      const logData: RenderLogModel = {
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString(),
        level,
        service,
        message,
        ip_address: ipAddress,
      };

      const result = await db.insert<RenderLogModel>(this.LOGS_TABLE, logData);
      return !!result;
    } catch (err) {
      // Gracefully log locally if table is missing or write fails
      console.log(`[RenderLog fallback] [${level.toUpperCase()}] [${service}] ${message}`);
      return false;
    }
  }
}
