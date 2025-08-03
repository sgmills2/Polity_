import express from 'express';
import asyncHandler from 'express-async-handler';
import { realDataApi } from '../services/realDataApi';
import { supabase } from '../config/supabase';

const router = express.Router();

// Get all politicians
router.get('/', asyncHandler(async (_req, res) => {
  try {
    // Try to get politicians with voting stats first
    const realData = await realDataApi.getAllPoliticiansWithStats();
    
    if (realData.length > 0) {
      res.json(realData);
      return;
    }

    // Fallback to basic politician data
    const { data: politicians, error } = await supabase
      .from('politicians')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    res.json(politicians);
  } catch (error) {
    console.error('Error fetching politicians:', error);
    res.status(500).json({ error: 'Failed to fetch politicians' });
  }
}));

// Get single politician by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get politician with voting stats
    const realData = await realDataApi.getPoliticianWithStats(id);
    
    if (realData) {
      res.json(realData);
      return;
    }

    // Fallback to basic politician data
    const { data: politician, error } = await supabase
      .from('politicians')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!politician) {
      res.status(404).json({ error: 'Politician not found' });
      return;
    }

    res.json(politician);
  } catch (error) {
    console.error('Error fetching politician:', error);
    res.status(500).json({ error: 'Failed to fetch politician' });
  }
}));

// Get politician's real voting history
router.get('/:id/voting-history', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const votingHistory = await realDataApi.getPoliticianVotingHistory(id, limit);
    
    res.json(votingHistory);
  } catch (error) {
    console.error('Error fetching voting history:', error);
    res.status(500).json({ error: 'Failed to fetch voting history' });
  }
}));

// Get politician's real political scores across all topics
router.get('/:id/scores', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const scores = await realDataApi.getPoliticianScores(id);
    
    res.json(scores);
  } catch (error) {
    console.error('Error fetching politician scores:', error);
    res.status(500).json({ error: 'Failed to fetch politician scores' });
  }
}));

// Check if real voting data is available
router.get('/data/status', asyncHandler(async (_req, res) => {
  try {
    const dataStatus = await realDataApi.hasRealVotingData();
    const recentActivity = await realDataApi.getRecentActivity();
    
    res.json({
      ...dataStatus,
      ...recentActivity
    });
  } catch (error) {
    console.error('Error checking data status:', error);
    res.status(500).json({ error: 'Failed to check data status' });
  }
}));

export default router; 