import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { AssetDownloader } from './downloader.js';
import { AssetUploader } from './uploader.js';
import { FFmpegCommandBuilder, ExportPreset } from './render/FFmpegCommandBuilder.js';
import { RenderLayer } from './render/LayerEngine.js';
import { OutputManager } from './render/OutputManager.js';
import { FontManager } from './render/FontManager.js';

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

// Worker Telemetry Metrics
const metrics = {
  startTime: Date.now(),
  reconnections: 0,
  failures: 0,
  completedRenders: 0
};

let ws: WebSocket | null = null;
let isBusy = false;
let currentJobId: string | null = null;
let currentFFmpegProcess: ChildProcess | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;

let isAlive = true;
let reconnectAttempts = 0;

// Ensure temp_assets output dirs exist, clean up any previous runs leftover files
const tempAssetsRoot = path.resolve(process.cwd(), 'temp_assets');
if (fs.existsSync(tempAssetsRoot)) {
  try {
    fs.rmSync(tempAssetsRoot, { recursive: true, force: true });
    console.log('[Cleanup] Cleaned up temp_assets root on startup.');
  } catch (err: any) {
    console.error('[Cleanup] Failed to clean up temp_assets on startup:', err.message);
  }
}
fs.mkdirSync(tempAssetsRoot, { recursive: true });

/**
 * Runs a standalone diagnostic suite using the worker's exact FFmpeg configuration
 */
function runFFmpegDiagnosticSuite() {
  console.log('\n=====================================================');
  console.log('🔍 RUNNING WORKER FFMPEG DIAGNOSTIC SUITE');
  console.log('=====================================================');

  const absFFmpegPath = path.resolve(FFMPEG_PATH);
  console.log(`[Diagnostic] Executable Path: ${absFFmpegPath}`);
  console.log(`[Diagnostic] Architecture:  ${process.arch}`);
  console.log(`[Diagnostic] Platform:      ${process.platform}`);

  try {
    const verRes = spawnSync(FFMPEG_PATH, ['-version'], { encoding: 'utf8' });
    const firstLine = (verRes.stdout || verRes.stderr || '').split('\n')[0];
    console.log(`[Diagnostic] Version: ${firstLine}`);
  } catch (err: any) {
    console.error(`[Diagnostic] Failed executing -version:`, err.message);
  }

  try {
    const encRes = spawnSync(FFMPEG_PATH, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    const hasX264 = (encRes.stdout || '').includes('libx264');
    console.log(`[Diagnostic] libx264 encoder support: ${hasX264 ? 'YES' : 'NO'}`);
  } catch (err: any) {
    console.error(`[Diagnostic] Failed checking encoders:`, err.message);
  }

  const diagDir = path.resolve(tempAssetsRoot, 'diagnostic_tests');
  if (!fs.existsSync(diagDir)) fs.mkdirSync(diagDir, { recursive: true });

  let fontParam = '';
  try {
    const defaultFontPath = FontManager.getDefaultFontPath();
    console.log(`[Diagnostic Font] Using default font path: ${defaultFontPath}`);
    fontParam = FontManager.getFFmpegFontParam();
    console.log(`[Diagnostic Font] Formatted font param: ${fontParam}`);
  } catch (fontErr: any) {
    console.error(`[Diagnostic Font] FAILED to resolve default font: ${fontErr.message}`);
  }

  const tests = [
    { name: 'TEST_A_BASIC_COLOR', args: ['-f', 'lavfi', '-i', 'color=c=black:s=320x320:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', path.join(diagDir, 'test_a.mp4')] },
    { name: 'TEST_B_REELS_RESOL', args: ['-f', 'lavfi', '-i', 'color=c=030712:s=1080x1920:d=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', path.join(diagDir, 'test_b.mp4')] },
    {
      name: 'TEST_C_FULL_RENDER',
      args: [
        '-f', 'lavfi', '-i', 'color=c=030712:s=1080x1920:d=3',
        '-filter_complex', `[0:v]drawtext=${fontParam}:text='Fábrica viral ativada...':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=200:enable='between(t\\,0\\,3)'[t1];[t1]drawtext=${fontParam}:text='Render [Customizado] - ssstik.io_@_lszny':fontcolor=0xE2E8F0:fontsize=38:x=(w-text_w)/2:y=300:enable='between(t\\,0\\,3)'[t2];[t2]drawbox=y=1840:color='0x6366F1':width='iw*min(max(t/3\\,0)\\,1)':height=16:t=fill:enable='between(t\\,0\\,3)'[out]`,
        '-map', '[out]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', path.join(diagDir, 'test_c.mp4')
      ]
    }
  ];

  for (const t of tests) {
    const start = Date.now();
    try {
      const res = spawnSync(FFMPEG_PATH, t.args, { encoding: 'utf8', timeout: 15000 });
      const durationMs = Date.now() - start;
      const outFile = t.args[t.args.length - 1];
      const exists = fs.existsSync(outFile);
      const size = exists ? fs.statSync(outFile).size : 0;

      console.log(`[Diagnostic ${t.name}] Status: Exit Code ${res.status}, Signal: ${res.signal || 'None'}, Duration: ${durationMs}ms, Size: ${size} bytes`);
      if (res.status !== 0) {
        console.error(`[Diagnostic ${t.name}] Stderr: ${res.stderr?.slice(-1000)}`);
      }
    } catch (err: any) {
      console.error(`[Diagnostic ${t.name}] Exception: ${err.message}`);
    }
  }

  try {
    fs.rmSync(diagDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('=====================================================\n');
}

runFFmpegDiagnosticSuite();

/**
 * Structured log emitter for monitoring/auditing/telemetry
 */
function logStructured(event: string, details: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    workerId: WORKER_ID,
    event,
    ...details,
    metrics: {
      uptimeSeconds: Math.round((Date.now() - metrics.startTime) / 1000),
      reconnections: metrics.reconnections,
      failures: metrics.failures,
      completedRenders: metrics.completedRenders
    }
  };
  console.log(JSON.stringify(logData));
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
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  logStructured('CONNECTION_CONNECTING', { wsUrl: WS_URL });
  console.log(`[WebSocket] Connecting to SaaS WebSocket coordinator at: ${WS_URL}...`);
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    reconnectAttempts = 0; // reset backoff upon successful connection
    metrics.reconnections++;
    isAlive = true;

    logStructured('CONNECTION_OPEN', { details: 'Connected to coordinator successfully.' });
    console.log('✔ [WebSocket] Connected to SaaS WebSocket coordinator successfully!');
    
    // Register worker with correct properties including busy state for automated recovery
    const stats = getSystemStats();
    sendEvent('register', {
      id: WORKER_ID,
      cores: stats.cpuCores,
      ram: Math.round(stats.ramTotalMb / 1024), // GB
      gpu: stats.cpuModel,
      os: `${stats.osPlatform === 'win32' ? 'Windows' : stats.osPlatform === 'darwin' ? 'macOS' : 'Linux'} (${os.release()})`,
      ffmpeg: FFMPEG_PATH,
      version: '1.0.0',
      status: isBusy ? 'busy' : 'idle',
      currentJobId: currentJobId || undefined
    });

    // Start heartbeat & liveness check
    startHeartbeat();
    startLivenessCheck();
  });

  ws.on('pong', () => {
    isAlive = true;
  });

  ws.on('message', async (rawData: WebSocket.RawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      console.log('[WORKER]');
      console.log(`Evento recebido: ${data.type}`);
      
      if (data.type === 'start_job') {
        const { jobId, layers, preset, duration, uploadUrls } = data.payload;
        console.log('[WORKER]');
        console.log(`Job recebido: ${jobId}`);
        await executeJob(jobId, layers, preset, duration, uploadUrls);
      } else if (data.type === 'abort_job') {
        const { jobId } = data.payload;
        if (currentJobId === jobId) {
          abortCurrentJob('User requested cancellation.');
        }
      }
    } catch (err: any) {
      logStructured('MESSAGE_PARSE_ERROR', { error: err.message });
      console.error('[WebSocket] Error parsing received message:', err);
    }
  });

  ws.on('close', (code, reason) => {
    logStructured('CONNECTION_CLOSE', { code, reason: reason?.toString() || 'None' });
    console.warn(`✖ [WebSocket] Disconnected from SaaS. Code: ${code}. Reason: ${reason || 'None'}`);
    stopHeartbeat();
    stopLivenessCheck();
    scheduleReconnect();
  });

  ws.on('error', (err) => {
    logStructured('CONNECTION_ERROR', { error: err.message });
    console.error('✖ [WebSocket] Connection error:', err.message);
  });
}

/**
 * Implements exponential backoff scheduler for reconnect attempts
 */
function scheduleReconnect() {
  if (reconnectTimeout) return;

  reconnectAttempts++;
  
  // 1st attempt: 2s, 2nd: 4s, 3rd: 8s, 4th: 16s, maximum: 60s
  let delay = 60000;
  if (reconnectAttempts === 1) delay = 2000;
  else if (reconnectAttempts === 2) delay = 4000;
  else if (reconnectAttempts === 3) delay = 8000;
  else if (reconnectAttempts === 4) delay = 16000;

  logStructured('RECONNECT_SCHEDULED', { delayMs: delay, attempt: reconnectAttempts });
  console.log(`[WebSocket] Scheduling reconnection attempt #${reconnectAttempts} in ${delay / 1000}s...`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connect();
  }, delay);
}

/**
 * Starts resilient heartbeat loop reporting live telemetry
 */
function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const stats = getSystemStats();
      sendEvent('heartbeat', {
        cpuUsage: stats.cpuUsagePercent,
        ramUsage: stats.ramUsagePercent,
        currentJobs: currentJobId ? [currentJobId] : []
      });
      logStructured('HEARTBEAT', { cpuUsage: stats.cpuUsagePercent, ramUsage: stats.ramUsagePercent });
    }
  }, 10000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Active frozen connection detection using WebSocket ping/pong
 */
function startLivenessCheck() {
  if (pingInterval) clearInterval(pingInterval);
  isAlive = true;
  pingInterval = setInterval(() => {
    if (!isAlive) {
      logStructured('FROZEN_CONNECTION_DETECTED', { details: 'No pong response received within interval. Terminating socket.' });
      console.warn('✖ [WebSocket] Liveness check failed. Connection frozen. Forcing disconnect...');
      ws?.terminate();
      return;
    }
    isAlive = false;
    try {
      ws?.ping();
    } catch (err: any) {
      console.error('[WebSocket] Failed sending ping frame:', err.message);
    }
  }, 15000);
}

// Stops active ping checks
function stopLivenessCheck() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

function sendEvent(type: string, payload: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ type, payload }));
    } catch (err: any) {
      console.error('[WebSocket] Failed to send event payload:', err.message);
    }
  }
}

/**
 * Aborts the current job in progress safely
 */
function abortCurrentJob(reason: string) {
  if (currentFFmpegProcess) {
    logStructured('JOB_ABORTING', { jobId: currentJobId, reason });
    console.warn(`[Abort] Safely terminating FFmpeg process for Job ${currentJobId}. Reason: ${reason}`);
    try {
      currentFFmpegProcess.kill('SIGKILL');
    } catch (e) {}
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
  duration: number,
  uploadUrls?: { video: string; thumbnail: string; preview: string }
) {
  if (isBusy) {
    console.warn(`[Job Queue] Worker is already busy! Rejecting start_job for Job ${jobId}`);
    return;
  }

  isBusy = true;
  currentJobId = jobId;
  const logs: string[] = [];

  let lastProgressSentTime = 0;
  let lastProgressSentValue = -1;
  let lastProgressSentStatus = '';

  const sendProgressThrottled = (status: string, progress: number, logsToInclude?: string[], force = false) => {
    const now = Date.now();
    const isLogUpdate = progress === -1;
    const progressVal = progress >= 0 ? Math.max(0, Math.min(100, Math.round(progress))) : (lastProgressSentValue >= 0 ? lastProgressSentValue : 0);
    const statusChanged = status !== lastProgressSentStatus;
    const progressJump = progressVal - lastProgressSentValue >= 1;
    const timeElapsed = now - lastProgressSentTime >= 500;

    if (force || isLogUpdate || statusChanged || progressJump || timeElapsed) {
      sendEvent('job_progress', {
        jobId,
        status,
        progress: progressVal,
        ...(logsToInclude ? { logs: logsToInclude } : {})
      });
      lastProgressSentTime = now;
      if (progress >= 0) {
        lastProgressSentValue = progressVal;
      }
      lastProgressSentStatus = status;
    }
  };

  const addLog = (stage: string, message: string, isError = false) => {
    const timeStr = new Date().toLocaleTimeString('pt-BR');
    const prefix = isError ? '[ERRO]' : '[INFO]';
    const logLine = `[${timeStr}] [${stage}] ${prefix} ${message}`;
    logs.push(logLine);
    console.log(`[Job ${jobId}] ${logLine}`);
    
    // Send real-time log updates back to backend without resetting progress to -1
    sendProgressThrottled('Rendering', lastProgressSentValue >= 0 ? lastProgressSentValue : 0, [logLine]);
  };

  logStructured('JOB_START', { jobId, layersCount: layers.length, preset: preset?.id, duration });
  addLog('Worker Init', `Worker ${WORKER_ID} claimed Job ${jobId}. Beginning pipeline...`);

  const jobTempDir = path.resolve(tempAssetsRoot, jobId);
  const localOutputVideoPath = path.join(jobTempDir, `completed_render.mp4`);
  const localOutputThumbPath = path.join(jobTempDir, `completed_thumb.jpg`);
  const localOutputPreviewPath = path.join(jobTempDir, `completed_preview.mp4`);

  let ffmpegTimeout: NodeJS.Timeout | null = null;

  try {
    // Ensure unique clean job-specific folder
    if (fs.existsSync(jobTempDir)) {
      fs.rmSync(jobTempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(jobTempDir, { recursive: true });

    // -------------------------------------------------------------
    // PHASE 1: DOWNLOAD ASSETS
    // -------------------------------------------------------------
    addLog('Downloading Assets', 'Downloading remote media assets locally...');
    sendProgressThrottled('Preparing', 15, undefined, true);

    const resolvedAssets = await AssetDownloader.downloadAssets({
      jobId,
      layers,
      apiUrl: API_URL
    });

    addLog('Downloading Assets', `All assets downloaded successfully. Resolved ${resolvedAssets.size} keys.`);
    sendProgressThrottled('Preparing', 25, undefined, true);

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
    // Font Pre-flight Check
    try {
      const fontPath = FontManager.getDefaultFontPath();
      const isAbsolute = path.isAbsolute(fontPath);
      const exists = fs.existsSync(fontPath);
      let isFile = false;
      let isReadable = false;

      if (exists) {
        const stats = fs.statSync(fontPath);
        isFile = stats.isFile() && stats.size > 0;
        try {
          fs.accessSync(fontPath, fs.constants.R_OK);
          isReadable = true;
        } catch {}
      }

      addLog('FFmpeg Render', `[FFmpeg Font] Using font: ${fontPath}`);
      addLog('FFmpeg Render', `[FFmpeg Font] Exists: ${exists}`);
      addLog('FFmpeg Render', `[FFmpeg Font] Readable: ${isReadable}`);

      if (!exists || !isFile || !isReadable || !isAbsolute) {
        throw new Error(
          `Default render font check failed at path "${fontPath}". (exists: ${exists}, isFile: ${isFile}, isReadable: ${isReadable}, isAbsolute: ${isAbsolute})`
        );
      }
    } catch (fontErr: any) {
      const errMsg = `FONT_PREFLIGHT_FAILED: ${fontErr.message}`;
      addLog('FFmpeg Render', errMsg, true);
      throw new Error(errMsg);
    }

    addLog('FFmpeg Render', `Executing FFmpeg process... Final command string:\n${commandResult.commandString}`);
    sendProgressThrottled('Rendering', 25, undefined, true);

    const ffmpegStartTime = Date.now();
    let stdoutData = '';
    let stderrData = '';

    // Configurable timeout to abort stuck/frozen FFmpeg operations
    const timeoutMinutes = parseFloat(process.env.JOB_TIMEOUT_MINUTES || '10');
    const localTimeoutLimitMs = parseInt(process.env.JOB_TIMEOUT_MS || String(timeoutMinutes * 60 * 1000), 10);

    ffmpegTimeout = setTimeout(() => {
      logStructured('MALICIOUS_ATTEMPT', {
        type: 'FFMPEG_STUCK_TIMEOUT',
        jobId,
        limitMs: localTimeoutLimitMs
      });
      abortCurrentJob(`FFmpeg processing got stuck or exceeded maximum local limit of ${localTimeoutLimitMs}ms.`);
    }, localTimeoutLimitMs);

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
              
              sendProgressThrottled(currentStatus, estimatedPercent);

              console.log(`[Job ${jobId}] Rendering: ${estimatedPercent}% completed (${timeMatch[0]})`);
            }
          }
        }
      });

      currentFFmpegProcess?.on('close', (code) => {
        currentFFmpegProcess = null;
        const isNativeCrash = code === 3221225477 || code === -1073741819 || (code !== null && (code >>> 0) === 3221225477);
        if (code === 0) {
          addLog('FFmpeg Render', 'FFmpeg exited successfully with code 0.');
          resolve();
        } else if (isNativeCrash) {
          const crashMsg = `FFmpeg native crash detected: Windows Access Violation (0xC0000005 / exit code ${code}). Stderr snippet: ${stderrData.slice(-1000)}`;
          addLog('FFmpeg Render', crashMsg, true);
          logStructured('FFMPEG_NATIVE_CRASH', { jobId, exitCode: code, stderr: stderrData.slice(-2000) });
          reject(new Error(crashMsg));
        } else {
          addLog('FFmpeg Render', `FFmpeg closed with exit code ${code}. Stderr snippet: ${stderrData.slice(-1000)}`, true);
          reject(new Error(`FFmpeg exited with error code ${code}`));
        }
      });

      currentFFmpegProcess?.on('error', (err) => {
        currentFFmpegProcess = null;
        addLog('FFmpeg Render', `FFmpeg process error: ${err.message}`, true);
        reject(err);
      });
    });

    if (ffmpegTimeout) {
      clearTimeout(ffmpegTimeout);
      ffmpegTimeout = null;
    }

    const ffmpegEndTime = Date.now();
    const executionTimeMs = ffmpegEndTime - ffmpegStartTime;

    // Validate video output file strictly
    if (!fs.existsSync(localOutputVideoPath)) {
      throw new Error(`OUTPUT_VALIDATION_FAILED: Output file not created at: ${localOutputVideoPath}`);
    }
    const videoStats = fs.statSync(localOutputVideoPath);
    if (videoStats.size === 0) {
      throw new Error(`OUTPUT_VALIDATION_FAILED: Video output file was created but is 0 bytes.`);
    }

    const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    try {
      const probeRes = spawnSync(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=noprintwrappers=1', localOutputVideoPath], { encoding: 'utf8' });
      if (probeRes.status === 0 && probeRes.stdout) {
        addLog('FFmpeg Render', `FFprobe validation: ${probeRes.stdout.trim().replace(/\n/g, ', ')}`);
      }
    } catch (e: any) {
      addLog('FFmpeg Render', `FFprobe validation note: ${e.message}`);
    }

    addLog('FFmpeg Render', `Output validated successfully. Size: ${(videoStats.size / 1024 / 1024).toFixed(2)} MB.`);

    // -------------------------------------------------------------
    // PHASE 4: EXTRACT THUMBNAIL & PREVIEW
    // -------------------------------------------------------------
    addLog('Output Generation', 'Generating thumbnail frame extraction & preview video clip...');
    sendProgressThrottled('Saving', 92, undefined, true);

    await OutputManager.generateThumbnail(localOutputVideoPath, localOutputThumbPath, FFMPEG_PATH);
    await OutputManager.generatePreview(localOutputVideoPath, localOutputPreviewPath, FFMPEG_PATH);

    addLog('Output Generation', 'Thumbnail & preview video generated successfully.');

    // -------------------------------------------------------------
    // PHASE 5: UPLOAD FILES
    // -------------------------------------------------------------
    addLog('Asset Upload', 'Uploading rendered assets back to the SaaS storage...');
    sendProgressThrottled('Saving', 95, undefined, true);

    const uploadResult = await AssetUploader.uploadOutputs({
      jobId,
      apiUrl: API_URL,
      videoPath: localOutputVideoPath,
      thumbnailPath: localOutputThumbPath,
      previewPath: localOutputPreviewPath,
      uploadUrls
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

    metrics.completedRenders++;
    logStructured('JOB_COMPLETED', { jobId, executionTimeMs });

  } catch (err: any) {
    if (ffmpegTimeout) {
      clearTimeout(ffmpegTimeout);
      ffmpegTimeout = null;
    }

    metrics.failures++;
    logStructured('JOB_FAILED', { jobId, error: err.message });

    addLog('Pipeline Fail', `Job rendering pipeline crashed: ${err.message}`, true);
    sendEvent('job_failed', {
      jobId,
      error: err.message,
      logs
    });
  } finally {
    // -------------------------------------------------------------
    // PHASE 7: AUTOMATIC TEMP FOLDER CLEANUP (RESILIENT EXCEPTION HANDLING)
    // -------------------------------------------------------------
    try {
      console.log(`[Cleanup] Purging temporary folder for Job ${jobId}: ${jobTempDir}`);
      if (fs.existsSync(jobTempDir)) {
        fs.rmSync(jobTempDir, { recursive: true, force: true });
      }
      logStructured('TEMP_CLEANUP', { jobId, jobTempDir });
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
