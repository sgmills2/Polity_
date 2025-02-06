import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as syncService from '../services/sync';

const router = Router();

router.post('/politicians', asyncHandler(async (req, res) => {
  await syncService.syncPoliticians();
  res.json({ message: 'Sync completed successfully' });
}));

export default router; 