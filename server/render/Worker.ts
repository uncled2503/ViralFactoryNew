import { JobQueue, RenderJob } from './JobQueue';
import { RenderEngine } from './RenderEngine';

export class RenderWorker {
  private id: string;
  private isProcessing = false;
  private maxConcurrency = 1; // can be increased to support multiple concurrent workers

  constructor(id = `worker-${Math.random().toString(36).substring(2, 6)}`) {
    this.id = id;
    console.log(`[RenderWorker ${this.id}] Initialized`);
  }

  /**
   * Start listening for active jobs in the queue
   */
  start() {
    // Listen for queue additions
    JobQueue.emitter.on('jobAdded', () => {
      this.checkQueue();
    });

    JobQueue.emitter.on('queueChanged', () => {
      this.checkQueue();
    });

    // Start initial sweep
    this.checkQueue();
  }

  /**
   * Checks the queue for next available Queued job
   */
  private async checkQueue() {
    if (this.isProcessing) return;

    const nextJob = JobQueue.getNextJob();
    if (nextJob) {
      this.isProcessing = true;
      console.log(`[RenderWorker ${this.id}] Found job in queue. Starting processing of job: ${nextJob.id}`);
      
      try {
        await RenderEngine.processJob(nextJob.id);
      } catch (err) {
        console.error(`[RenderWorker ${this.id}] Error processing job ${nextJob.id}:`, err);
      } finally {
        this.isProcessing = false;
        // Schedule next sweep on next tick
        setTimeout(() => this.checkQueue(), 100);
      }
    }
  }

  getStatus() {
    return {
      id: this.id,
      status: this.isProcessing ? 'busy' : 'online',
      concurrencyLimit: this.maxConcurrency
    };
  }
}
