import { JobQueue } from '../render/JobQueue';
import { RenderEngine } from '../render/RenderEngine';
import { TemplateEngine } from '../render/TemplateEngine';
import { LayerEngine } from '../render/LayerEngine';
import { ExportPresetManager } from '../render/ExportPresetManager';
import { WorkerRegistry } from './WorkerRegistry';
import { WorkerConnection } from './WorkerConnection';
import { SupabaseStorageService } from '../services/SupabaseStorageService';

export class JobDispatcher {
  private static isDispatching = false;

  /**
   * Evaluates the best available idle worker using hardware and telemetric scoring
   */
  private static findBestWorker(): WorkerConnection | null {
    const allWorkers = WorkerRegistry.getAll();
    const idleWorkers = WorkerRegistry.getIdleWorkers();

    console.log('[QUEUE]');
    console.log(`Workers disponíveis: ${idleWorkers.length}`);

    // Log detailed eligibility for all connected workers
    allWorkers.forEach(w => {
      const isConnected = w.socket.readyState === 1;
      const isIdle = w.status === 'idle';
      const isEligible = isConnected && isIdle;
      
      console.log(`[WORKER SELECTION] worker=${w.id} connected=${isConnected} ready=${isConnected} status=${w.status} busy=${w.status === 'busy'} lastHeartbeat=${w.lastHeartbeat} capacity=1 currentJobs=${w.currentJobId ? 1 : 0} health=ok capabilities=ffmpeg eligible=${isEligible}`);
      if (!isEligible) {
        const reason = !isConnected ? 'socket_not_open' : !isIdle ? 'worker_status_busy' : 'unknown';
        console.log(`[WORKER SELECTION] worker=${w.id} eligible=false reason=${reason}`);
      }
    });

    if (idleWorkers.length === 0) return null;

    // Sort idle workers: lower CPU usage first, then more total RAM, then lower RAM usage
    return idleWorkers.sort((a, b) => {
      if (a.cpuUsage !== b.cpuUsage) {
        return a.cpuUsage - b.cpuUsage;
      }
      if (b.totalRam !== a.totalRam) {
        return b.totalRam - a.totalRam; // higher total RAM preferred
      }
      return a.ramUsage - b.ramUsage;
    })[0];
  }

  /**
   * Triggers the distribution pipeline to match queued jobs with available workers
   */
  static async distributeJobs() {
    if (this.isDispatching) return;
    this.isDispatching = true;

    try {
      while (true) {
        const nextJob = JobQueue.getNextJob();
        if (!nextJob) break;

        console.log('[QUEUE]');
        console.log(`Task detectada: ${nextJob.id}`);

        const bestWorker = this.findBestWorker();
        if (!bestWorker) {
          console.log('[JobDispatcher] Jobs are queued, but all workers are currently busy or offline.');
          break;
        }

        console.log('[QUEUE]');
        console.log(`Worker selecionado: ${bestWorker.id}`);

        console.log('[QUEUE]');
        console.log(`Task atribuída ao worker: ${bestWorker.id}`);

        console.log(`[JobDispatcher] Selected worker "${bestWorker.id}" to process Job ${nextJob.id}`);
        
        // Lock worker and job
        bestWorker.status = 'busy';
        bestWorker.currentJobId = nextJob.id;

        // Transition job state
        JobQueue.updateProgress(nextJob.id, 'Preparing', 5);
        await RenderEngine.saveDbStatus(nextJob.id, 'Preparing', 5, undefined, undefined, undefined, [
          `[SYSTEM] Job despachado com sucesso para o render-worker remoto: "${bestWorker.id}"`
        ]);

        try {
          // Compile project layouts, variables, and presets
          const projectData = await (RenderEngine as any).fetchProject(nextJob.projectId, nextJob.userId);
          if (!projectData) {
            throw new Error(`Projeto ${nextJob.projectId} não encontrado.`);
          }

          const templateData = await (RenderEngine as any).fetchTemplate(nextJob.templateId, nextJob.userId);
          if (!templateData) {
            throw new Error(`Template ${nextJob.templateId} não encontrado.`);
          }

          if (!projectData.variables || Object.keys(projectData.variables).length === 0) {
            projectData.variables = nextJob.variables || {};
          }

          const vars = { ...projectData.variables, ...(nextJob.variables || {}) };
          const baseTemplateJson = TemplateEngine.getTemplateJson(templateData, projectData);
          
          if (!baseTemplateJson) {
            throw new Error('Falha ao compilar JSON estruturado do template.');
          }

          const compiledTemplateJson = TemplateEngine.compile(baseTemplateJson, vars);
          const renderLayers = LayerEngine.compileLayers(compiledTemplateJson);

          // Resolve layers to secure Supabase signed download URLs if configured
          const resolvedLayers = [];
          for (const layer of renderLayers) {
            const resolvedLayer = JSON.parse(JSON.stringify(layer)); // deep copy
            if (resolvedLayer.data) {
              if (resolvedLayer.data.content) {
                resolvedLayer.data.content = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.content);
              }
              if (resolvedLayer.data.imageUrl) {
                resolvedLayer.data.imageUrl = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.imageUrl);
              }
              if (resolvedLayer.data.videoUrl) {
                resolvedLayer.data.videoUrl = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.videoUrl);
              }
              if (resolvedLayer.data.audioUrl) {
                resolvedLayer.data.audioUrl = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.audioUrl);
              }
              if (resolvedLayer.data.subtitleFile) {
                resolvedLayer.data.subtitleFile = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.subtitleFile);
              }
              if (resolvedLayer.data.styles) {
                if (resolvedLayer.data.styles.imageUrl) {
                  resolvedLayer.data.styles.imageUrl = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.styles.imageUrl);
                }
                if (resolvedLayer.data.styles.videoUrl) {
                  resolvedLayer.data.styles.videoUrl = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.styles.videoUrl);
                }
                if (resolvedLayer.data.styles.audioUrl) {
                  resolvedLayer.data.styles.audioUrl = await SupabaseStorageService.resolveUrlToSigned(resolvedLayer.data.styles.audioUrl);
                }
              }
            }
            resolvedLayers.push(resolvedLayer);
          }
          
          const presetId = nextJob.variables?.presetId || projectData?.presetId || projectData?.preset || compiledTemplateJson?.presetId || 'tiktok';
          const preset = ExportPresetManager.getPreset(presetId);

          let videoDuration = Number(compiledTemplateJson?.duration || nextJob.variables?.duration || projectData?.variables?.duration || 30);
          if (nextJob.variables?.isSandbox) {
            videoDuration = 3;
          }

          // Generate Upload Signed URLs for Supabase Storage (or SaaS fallback endpoints)
          const uploadUrls = {
            video: await SupabaseStorageService.getUploadSignedUrl('rendered', `render_${nextJob.id}.mp4`, 'video/mp4'),
            thumbnail: await SupabaseStorageService.getUploadSignedUrl('rendered', `thumb_${nextJob.id}.jpg`, 'image/jpeg'),
            preview: await SupabaseStorageService.getUploadSignedUrl('rendered', `preview_${nextJob.id}.mp4`, 'video/mp4')
          };

          // Dispatch start_job down the WebSocket connection
          console.log('[DISPATCH]');
          console.log(`Enviando job ${nextJob.id} para ${bestWorker.id}`);
          console.log('[DISPATCH]');
          console.log(`WebSocket readyState: ${bestWorker.socket.readyState}`);

          const success = bestWorker.send('start_job', {
            jobId: nextJob.id,
            userId: nextJob.userId,
            projectId: nextJob.projectId,
            projectName: nextJob.projectName,
            duration: videoDuration,
            layers: resolvedLayers,
            preset: preset,
            variables: vars,
            uploadUrls
          });

          if (!success) {
            throw new Error(`Conexão perdida com o worker "${bestWorker.id}" ao tentar iniciar a renderização.`);
          }

          console.log('[DISPATCH]');
          console.log('Job enviado com sucesso');

          console.log(`[JobDispatcher] Sent start_job command successfully to "${bestWorker.id}" for Job ${nextJob.id}`);

        } catch (err: any) {
          console.error(`[JobDispatcher] Failed compiling/sending job ${nextJob.id} to worker: ${err.message}`);
          
          // Unlock worker
          bestWorker.status = 'idle';
          bestWorker.currentJobId = undefined;

          // Fail job
          JobQueue.updateJob(nextJob.id, {
            status: 'Failed',
            progress: 0,
            error: err.message,
            logs: [`[SYSTEM_ERROR] Falha de inicialização: ${err.message}`]
          });

          await RenderEngine.saveDbStatus(
            nextJob.id,
            'failed',
            0,
            undefined,
            undefined,
            err.message,
            [`[SYSTEM_ERROR] Falha de inicialização: ${err.message}`]
          );
        }
      }
    } finally {
      this.isDispatching = false;
    }
  }
}
