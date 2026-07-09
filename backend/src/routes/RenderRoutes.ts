import { Router } from 'express';
import { RenderController } from '../controllers/RenderController.js';

const router = Router();

// Render Routes as requested by user:
// POST /api/render
// GET /api/render/:id
// DELETE /api/render/:id
router.post('/', RenderController.createJob);
router.get('/:id', RenderController.getJob);
router.delete('/:id', RenderController.deleteJob);

export default router;
