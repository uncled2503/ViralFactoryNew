import { Request, Response } from 'express';
import { RenderService } from '../services/RenderService.js';
import { logger } from '../utils/logger.js';

export class RenderController {
  static async createJob(req: Request, res: Response): Promise<void> {
    const { userId, projectId, templateId, duration, variables } = req.body;

    if (!userId || !projectId || !templateId) {
      res.status(400).json({ error: 'Missing required parameters: userId, projectId, templateId' });
      return;
    }

    try {
      const job = await RenderService.submitJob({
        userId,
        projectId,
        templateId,
        duration,
        variables
      });

      res.status(201).json({
        success: true,
        message: 'Render job successfully queued',
        job
      });
    } catch (err: any) {
      logger.error('Error creating render job:', err);
      res.status(500).json({ error: err.message || 'Failed to submit render job' });
    }
  }

  static getJob(req: Request, res: Response): void {
    const { id } = req.params;

    try {
      const job = RenderService.getJobStatus(id);
      if (!job) {
        res.status(404).json({ error: `Render job with ID ${id} not found` });
        return;
      }

      res.status(200).json(job);
    } catch (err: any) {
      logger.error(`Error querying render job ${id}:`, err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  static deleteJob(req: Request, res: Response): void {
    const { id } = req.params;

    try {
      const success = RenderService.cancelJob(id);
      if (!success) {
        res.status(404).json({ error: `Render job with ID ${id} not found or cannot be canceled` });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Render job ${id} canceled/deleted successfully`
      });
    } catch (err: any) {
      logger.error(`Error canceling render job ${id}:`, err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
}
export default RenderController;
