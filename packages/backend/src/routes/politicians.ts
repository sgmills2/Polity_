import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import * as politicianService from '../services/politicians';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const politicians = await politicianService.getPoliticians();
  res.json(politicians);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const politician = await politicianService.getPoliticianById(req.params.id);
  if (!politician) {
    res.status(404).json({ message: 'Politician not found' });
    return;
  }
  res.json(politician);
}));

router.get('/:id/voting-history', asyncHandler(async (req, res) => {
  const votingHistory = await politicianService.getPoliticianVotingHistory(req.params.id);
  res.json(votingHistory);
}));

export default router; 