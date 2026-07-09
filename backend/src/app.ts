import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import renderRouter from './routes/RenderRoutes.js';
import { StorageManager } from './storage/StorageManager.js';
import { RenderWorker } from './workers/RenderWorker.js';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Setup express middle-wares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize folders and components
StorageManager.init();

// Initialize and start render queue worker
const worker = new RenderWorker();
worker.start();

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    time: new Date().toISOString(),
    worker: worker.getStatus()
  });
});

// Map routes
app.use('/api/render', renderRouter);

// Static directory for finished renders
app.use('/storage/rendered', express.static(StorageManager.getOutputPath('')));

// Graceful worker teardown on exit
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Stopping render worker...');
  worker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Stopping render worker...');
  worker.stop();
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`[ViralFactory Backend] Listening at http://0.0.0.0:${PORT}`);
});

export default app;
