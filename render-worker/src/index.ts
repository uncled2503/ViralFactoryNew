import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { AssetDownloader } from './downloader.js';
import { AssetUploader } from './uploader.js';
import { FFmpegCommandBuilder, ExportPreset } from './render/FFmpegCommandBuilder.js';
import { RenderLayer } from './render/LayerEngine.js';
import { OutputManager } from './render/OutputManager.js';

// Load environment variables from .env
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws/worker';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const WORKER_ID = process.env.WORKER_ID || `worker-${os.hostname().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(Math.random() * 1000)}`;

console.log('=====================================================');
console.log(`🚀 STARTING VIRAL FACTORY DISTRIBUTED RENDER WORKER`);
console.log(`   Worker ID:   ${WORKER_ID}`);
console.log(`   SaaS API:    ${API_URL}`);
console.log(`   SaaS WS:     ${WS_URL}`);
console.log(`   FFmpeg Path: ${FFMPEG_PATH}`);
console.log('=====================================================');

let ws: WebSocket | null = null;
let isBusy = false;
let currentJobId: string | null = null;
let currentFFmpegProcess: ChildProcess | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;

// Ensure temp_assets output dirs exist
const tempAssetsRoot = path.resolve(process.cwd(), 'temp_assets');
if (!fs.existsSync(tempAssetsRoot)) {
  fs.mkdirSync(tempAssetsRoot, { recursive: true });
}

/**
 * Gets real-time machine hardware specs and current system stats
 */
function getSystemStats() {
  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;

  const totalMemMb = Math.round(totalMemBytes / (1024 * 1024));
  const freeMemMb = Math.round(freeMemBytes / (1024 * 1024));
  const usedMemMb = Math.round(usedMemBytes / (1024 * 1024));
  const ramUsagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

  // Simple load calculation
  const loadAverage = os.loadavg();
  const cpuUsagePercent = loadAverage[0] ? Math.round((loadAverage[0] / os.cpus().length) * 100) : 5;

  return {
    osPlatform: os.platform(),
    osRelease: os.release(),
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
    ramTotalMb: totalMemMb,
    ramUsedMb: usedMemMb,
    ramFreeMb: freeMemMb,
    ramUsagePercent,
    cpuUsagePercent: Math.min(cpuUsagePercent, 100),
  };
}

/**
 * Connects to the SaaS WebSocket Coordinator and sets up handlers
 */
function connect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);

  console.log(`[WebSocket] Connecting to SaaS WebSocket coordinator at: ${WS_URL}...`);
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('✔ [WebSocket] Connected to SaaS WebSocket coordinator successfully!');
    
    // Register worker with correct properties expected by Server
    const stats = getSystemStats();
    sendEvent('register', {
      id: WORKER_ID,
      hostname: os.hostname(),
      os: `${stats.osPlatform} ${stats.osRelease}`,
      totalRam: Math.round(stats.ramTotalMb / 1024), // Report in GB
      version: '1.0.0'
    });

    // Start heartbeat
    startHeartbeat();
  });

  ws.on('message', async (rawData: WebSocket.RawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      console.log(`[WebSocket] Received Event Type: "${data.type}"`);
      
      if (data.type === 'start_job') {
        const { jobId, layers, preset, duration } = data.payload;
        await executeJob(jobId, layers, preset, duration);
      } else if (data.type === 'abort_job') {
        const { jobId } = data.payload;
        if (currentJobId === jobId) {
          abortCurrentJob();
        }
      }
    } catch (err: any) {
      console.error('[WebSocket] Error parsing received message:', err);
    }
  });

  ws.on('close', (code, reason) => {
    console.warn(`✖ [WebSocket] Disconnected from SaaS. Code: ${code}. Reason: ${reason || 'None'}`);
    stopHeartbeat();
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    console.error('✖ [WebSocket] Connection error:', err.message);
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) return;
  console.log('[WebSocket] Reconnecting in 5 seconds...');
  reconnectTimeout = setTimeout(() => {
    connect();
  }, 5000);
}

function startHeartbeat() {
  stopHeartbeat();
  // Send heartbeat every 10 seconds to keep connection alive and report live metrics
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const stats = getSystemStats();
      sendEvent('heartbeat', {
        cpuUsage: stats.cpuUsagePercent,
        ramUsage: stats.ramUsagePercent
      });
    }
  }, 10000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function sendEvent(type: string, payload: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

/**
 * Aborts the current job in progress
 */
function abortCurrentJob() {
  if (currentFFmpegProcess) {
    console.warn(`[Abort] User requested termination. Killing active FFmpeg process...`);
    currentFFmpegProcess.kill('SIGKILL');
    currentFFmpegProcess = null;
  }
}

/**
 * Runs the rendering pipeline for a single distributed job
 */
async function executeJob(
  jobId: string, 
  layers: RenderLayer[], 
  preset: ExportPreset, 
  duration: number
) {
  if (isBusy) {
    console.warn(`[Job Queue] Worker is already busy! Rejecting start_job for Job ${jobId}`);
    return;
  }

  isBusy = true;
  currentJobId = jobId;
  const logs: string[] = [];

  const addLog = (stage: string, message: string, isError = false) => {
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const prefix = isError ? '[ERRO]' : '[INFO]';
    const logLine = `[${timeStr}] [${stage}] ${prefix} ${message}`;
    logs.push(logLine);
    console.log(`[Job ${jobId}] ${logLine}`);
    
    // Send real-time log updates back to backend
    sendEvent('job_progress', {
      jobId,
      status: 'Rendering',
      progress: -1, // -1 signals that this is a log update
      logs: [logLine]
    });
  };

  addLog('Worker Init', `Worker ${WORKER_ID} claimed Job ${jobId}. Beginning pipeline...`);

  const jobTempDir = path.resolve(tempAssetsRoot, jobId);
  const localOutputVideoPath = path.join(jobTempDir, `completed_render.mp4`);
  const localOutputThumbPath = path.join(jobTempDir, `completed_thumb.jpg`);
  const localOutputPreviewPath = path.join(jobTempDir, `completed_preview.mp4`);

  try {
    // -------------------------------------------------------------
    // PHASE 1: DOWNLOAD ASSETS
    // -------------------------------------------------------------
    addLog('Downloading Assets', 'Downloading remote media assets locally...');
    sendEvent('job_progress', { jobId, status: 'Preparing', progress: 15, logs });

    const resolvedAssets = await AssetDownloader.downloadAssets({
      jobId,
      layers,
      apiUrl: API_URL
    });

    addLog('Downloading Assets', `All assets downloaded successfully. Resolved ${resolvedAssets.size} keys.`);
    sendEvent('job_progress', { jobId, status: 'Preparing', progress: 25, logs });

    // -------------------------------------------------------------
    // PHASE 2: COMPILE FFMPEG COMMAND
    // -------------------------------------------------------------
    addLog('Compiling Command', 'Compiling visual layers into multi-pass FFmpeg command filter matrix...');
    const commandResult = FFmpegCommandBuilder.build({
      ffmpegPath: FFMPEG_PATH,
      layers,
      resolvedAssets,
      preset,
      duration,
      tempOutputPath: localOutputVideoPath
    });

    addLog('Compiling Command', `Command compiled. Has audio: ${commandResult.hasAudio ? 'Yes' : 'No'}`);
    addLog('Compiling Command', `Spawn String: ${commandResult.commandString}`);

    // -------------------------------------------------------------
    // PHASE 3: EXECUTE FFMPEG & TRACK PROGRESS
    // -------------------------------------------------------------
    addLog('FFmpeg Render', 'Executing FFmpeg process... Monitoring console standard error...');
    sendEvent('job_progress', { jobId, status: 'Rendering', progress: 25, logs });

    const ffmpegStartTime = Date.now();
    let stdoutData = '';
    let stderrData = '';

    currentFFmpegProcess = spawn(commandResult.command, commandResult.args);

    await new Promise<void>((resolve, reject) => {
      let lastReportedPercent = 25;

      currentFFmpegProcess?.stdout?.on('data', (data) => {
        stdoutData += data.toString();
      });

      currentFFmpegProcess?.stderr?.on('data', (data) => {
        const str = data.toString();
        stderrData += str;

        if (str.includes('frame=')) {
          const timeMatch = str.match(/time=(\d{2}):(\d{2}):(\d{2})/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1], 10);
            const mins = parseInt(timeMatch[2], 10);
            const secs = parseInt(timeMatch[3], 10);
            const totalSecs = hours * 3600 + mins * 60 + secs;

            const progressRatio = duration > 0 ? (totalSecs / duration) : 0;
            const estimatedPercent = Math.min(Math.round(25 + progressRatio * 65), 90);

            if (estimatedPercent > lastReportedPercent) {
              lastReportedPercent = estimatedPercent;
              const currentStatus = estimatedPercent < 65 ? 'Rendering' : 'Encoding';
              
              sendEvent('job_progress', {
                jobId,
                status: currentStatus,
                progress: estimatedPercent
              });

              console.log(`[Job ${jobId}] Rendering: ${estimatedPercent}% completed (${timeMatch[0]})`);
            }
          }
        }
      });

      currentFFmpegProcess?.on('close', (code) => {
        currentFFmpegProcess = null;
        if (code === 0) {
          addLog('FFmpeg Render', 'FFmpeg exited successfully with code 0.');
          resolve();
        } else {
          addLog('FFmpeg Render', `FFmpeg closed with exit code ${code}`, true);
          reject(new Error(`FFmpeg exited with error code ${code}`));
        }
      });

      currentFFmpegProcess?.on('error', (err) => {
        currentFFmpegProcess = null;
        addLog('FFmpeg Render', `FFmpeg process error: ${err.message}`, true);
        reject(err);
      });
    });

    const ffmpegEndTime = Date.now();
    const executionTimeMs = ffmpegEndTime - ffmpegStartTime;

    // Validate video output file
    if (!fs.existsSync(localOutputVideoPath)) {
      throw new Error(`Output file not created at: ${localOutputVideoPath}`);
    }
    const videoStats = fs.statSync(localOutputVideoPath);
    addLog('FFmpeg Render', `Output validated successfully. Size: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB.`);

    // -------------------------------------------------------------
    // PHASE 4: EXTRACT THUMBNAIL & PREVIEW
    // -------------------------------------------------------------
    addLog('Output Generation', 'Generating thumbnail frame extraction & preview video clip...');
    sendEvent('job_progress', { jobId, status: 'Saving', progress: 92, logs });

    await OutputManager.generateThumbnail(localOutputVideoPath, localOutputThumbPath, FFMPEG_PATH);
    await OutputManager.generatePreview(localOutputVideoPath, localOutputPreviewPath, FFMPEG_PATH);

    addLog('Output Generation', 'Thumbnail & preview video generated successfully.');

    // -------------------------------------------------------------
    // PHASE 5: UPLOAD FILES
    // -------------------------------------------------------------
    addLog('Asset Upload', 'Uploading rendered assets back to the SaaS storage...');
    sendEvent('job_progress', { jobId, status: 'Saving', progress: 95, logs });

    const uploadResult = await AssetUploader.uploadOutputs({
      jobId,
      apiUrl: API_URL,
      videoPath: localOutputVideoPath,
      thumbnailPath: localOutputThumbPath,
      previewPath: localOutputPreviewPath
    });

    addLog('Asset Upload', `Video uploaded to: ${uploadResult.videoUrl}`);
    addLog('Asset Upload', `Thumbnail uploaded to: ${uploadResult.thumbnailUrl}`);
    addLog('Asset Upload', `Preview uploaded to: ${uploadResult.previewUrl}`);

    // Compile dynamic debug info for dashboard inspector
    const debugInfo = {
      command: commandResult.commandString,
      executionTimeMs,
      stdout: stdoutData,
      stderr: stderrData,
      encodingTimeMs: executionTimeMs,
      fileSize: videoStats.size,
      bitrate: preset.videoBitrate,
      resolution: `${preset.width}x${preset.height}`,
      codec: preset.videoCodec,
      fps: preset.fps
    };

    // -------------------------------------------------------------
    // PHASE 6: COMPLETED SUCCESS REPORT
    // -------------------------------------------------------------
    addLog('Pipeline Complete', 'All stages finished perfectly. Sending completion payload.');
    sendEvent('job_completed', {
      jobId,
      outputUrl: uploadResult.videoUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      previewUrl: uploadResult.previewUrl,
      renderTime: `${(executionTimeMs / 1000).toFixed(1)}s`,
      logs,
      debugInfo
    });

  } catch (err: any) {
    addLog('Pipeline Fail', `Job rendering pipeline crashed: ${err.message}`, true);
    sendEvent('job_failed', {
      jobId,
      error: err.message,
      logs
    });
  } finally {
    // -------------------------------------------------------------
    // PHASE 7: AUTOMATIC TEMP FOLDER CLEANUP
    // -------------------------------------------------------------
    try {
      console.log(`[Cleanup] Purging temporary folder for Job ${jobId}: ${jobTempDir}`);
      if (fs.existsSync(jobTempDir)) {
        fs.rmSync(jobTempDir, { recursive: true, force: true });
      }
      console.log(`[Cleanup] Purge complete.`);
    } catch (cleanErr: any) {
      console.error('[Cleanup] Error deleting temporary job folders:', cleanErr.message);
    }

    // Reset loop states
    isBusy = false;
    currentJobId = null;
  }
}

// Boot connection
connect();
