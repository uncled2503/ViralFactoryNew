import { describe, it, expect, vi } from 'vitest';
import { JobQueue } from '../server/render/JobQueue';

describe('JobQueue Unit & Integration Tests', () => {
  it('should create a new job in queued state and emit events', () => {
    const onJobAdded = vi.fn();
    const onQueueChanged = vi.fn();

    JobQueue.emitter.on('jobAdded', onJobAdded);
    JobQueue.emitter.on('queueChanged', onQueueChanged);

    const job = JobQueue.createJob({
      userId: 'user-test-123',
      projectId: 'proj-test-123',
      projectName: 'Test Project',
      templateId: 'tpl-test-123',
      templateName: 'Test Template',
      duration: '0:10',
      variables: { test: true }
    });

    expect(job).toBeDefined();
    expect(job.id).toContain('job-');
    expect(job.status).toBe('Queued');
    expect(job.progress).toBe(0);
    expect(job.userId).toBe('user-test-123');
    expect(job.variables).toEqual({ test: true });

    expect(onJobAdded).toHaveBeenCalledWith(job);
    expect(onQueueChanged).toHaveBeenCalled();

    // Clean up listeners
    JobQueue.emitter.off('jobAdded', onJobAdded);
    JobQueue.emitter.off('queueChanged', onQueueChanged);
  });

  it('should retrieve job by id', () => {
    const job = JobQueue.createJob({
      userId: 'user-get',
      projectId: 'proj-get',
      projectName: 'Get Proj',
      templateId: 'tpl-get',
      templateName: 'Get Temp',
      duration: '0:05',
      variables: {}
    });

    const retrieved = JobQueue.getJob(job.id);
    expect(retrieved).toEqual(job);
  });

  it('should update job status and progress correctly', () => {
    const job = JobQueue.createJob({
      userId: 'user-up',
      projectId: 'proj-up',
      projectName: 'Up Proj',
      templateId: 'tpl-up',
      templateName: 'Up Temp',
      duration: '0:05',
      variables: {}
    });

    const onJobUpdated = vi.fn();
    JobQueue.emitter.on('jobUpdated', onJobUpdated);

    JobQueue.updateProgress(job.id, 'Rendering', 45);

    const updated = JobQueue.getJob(job.id);
    expect(updated?.status).toBe('Rendering');
    expect(updated?.progress).toBe(45);
    expect(onJobUpdated).toHaveBeenCalled();

    JobQueue.emitter.off('jobUpdated', onJobUpdated);
  });

  it('should retrieve next queued job correctly', () => {
    // Clear queue by resolving or setting to terminal status
    const all = JobQueue.getAllJobs();
    all.forEach(j => {
      JobQueue.updateJob(j.id, { status: 'Completed' });
    });

    expect(JobQueue.getNextJob()).toBeUndefined();

    // Add a queued job
    const job = JobQueue.createJob({
      userId: 'user-next',
      projectId: 'proj-next',
      projectName: 'Next Proj',
      templateId: 'tpl-next',
      templateName: 'Next Temp',
      duration: '0:10',
      variables: {}
    });

    const next = JobQueue.getNextJob();
    expect(next?.id).toBe(job.id);
  });

  it('should support job cancellation', () => {
    const job = JobQueue.createJob({
      userId: 'user-cancel',
      projectId: 'proj-cancel',
      projectName: 'Cancel Proj',
      templateId: 'tpl-cancel',
      templateName: 'Cancel Temp',
      duration: '0:15',
      variables: {}
    });

    expect(job.status).toBe('Queued');
    JobQueue.cancelJob(job.id);

    const cancelled = JobQueue.getJob(job.id);
    expect(cancelled?.status).toBe('Canceled');
    expect(cancelled?.progress).toBe(0);
  });
});
