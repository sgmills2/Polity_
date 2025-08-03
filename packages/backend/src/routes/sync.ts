import { Router } from 'express';
import asyncHandler from 'express-async-handler';

import * as politicalScoringService from '../services/politicalScoring';
import * as syncService from '../services/sync';
import * as votingRecordsService from '../services/votingRecords';
import { realVotingDataService } from '../services/realVotingDataSync';

const router = Router();

router.post('/politicians', asyncHandler(async (_req, res) => {
  try {
    console.log('Starting politician sync request...');
    const startTime = Date.now();
    
    const result = await syncService.syncPoliticians();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced ${result.totalSynced} politicians from Congress.gov`,
        data: {
          totalSynced: result.totalSynced,
          duration: `${duration}ms`,
          errors: result.errors.length > 0 ? result.errors : undefined
        }
      });
    } else {
      res.status(207).json({ // 207 Multi-Status for partial success
        success: false,
        message: result.totalSynced > 0 
          ? `Partially synced ${result.totalSynced} politicians with ${result.errors.length} errors`
          : 'Sync failed completely',
        data: {
          totalSynced: result.totalSynced,
          duration: `${duration}ms`,
          errors: result.errors
        }
      });
    }
  } catch (error) {
    console.error('Sync route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// New route for syncing voting records
router.post('/voting-records', asyncHandler(async (_req, res) => {
  try {
    console.log('Starting voting records sync request...');
    const startTime = Date.now();
    
    const { congress = 118, limit = 20 } = _req.body;
    
    const result = await votingRecordsService.syncVotingRecords(congress, limit);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced ${result.totalBills} bills with ${result.totalRecords} voting records`,
        data: {
          totalBills: result.totalBills,
          totalRecords: result.totalRecords,
          duration: `${duration}ms`,
          errors: result.errors.length > 0 ? result.errors : undefined
        }
      });
    } else {
      res.status(207).json({
        success: false,
        message: result.totalRecords > 0 
          ? `Partially synced ${result.totalBills} bills with ${result.errors.length} errors`
          : 'Voting records sync failed completely',
        data: {
          totalBills: result.totalBills,
          totalRecords: result.totalRecords,
          duration: `${duration}ms`,
          errors: result.errors
        }
      });
    }
  } catch (error) {
    console.error('Voting records sync route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during voting records sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// New enhanced voting data sync route using RealVotingDataService
router.post('/voting-data', asyncHandler(async (req, res) => {
  try {
    console.log('Starting enhanced voting data sync request...');
    const startTime = Date.now();
    
    const { 
      congress = 118, 
      billLimit = 50, 
      voteLimit = 25, 
      calculateScores = true 
    } = req.body;
    
    const result = await realVotingDataService.fullSync(congress, {
      billLimit,
      voteLimit,
      calculateScores
    });
    
    const duration = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced voting data: ${result.summary.totalRecords} records`,
        summary: result.summary,
        data: {
          duration: `${duration}ms`,
          errors: result.errors.length > 0 ? result.errors : undefined
        }
      });
    } else {
      res.status(207).json({
        success: false,
        message: result.summary.totalRecords > 0 
          ? `Partially synced voting data with ${result.errors.length} errors`
          : 'Voting data sync failed completely',
        summary: result.summary,
        data: {
          duration: `${duration}ms`,
          errors: result.errors
        }
      });
    }
  } catch (error) {
    console.error('Voting data sync route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during voting data sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// New route for calculating political scores
router.post('/calculate-scores', asyncHandler(async (_req, res) => {
  try {
    console.log('Starting political scores calculation request...');
    const startTime = Date.now();
    
    const result = await politicalScoringService.calculatePoliticalScores();
    const duration = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully calculated ${result.calculatedScores} political scores`,
        data: {
          calculatedScores: result.calculatedScores,
          duration: `${duration}ms`,
          errors: result.errors.length > 0 ? result.errors : undefined
        }
      });
    } else {
      res.status(207).json({
        success: false,
        message: result.calculatedScores > 0 
          ? `Partially calculated ${result.calculatedScores} scores with ${result.errors.length} errors`
          : 'Score calculation failed completely',
        data: {
          calculatedScores: result.calculatedScores,
          duration: `${duration}ms`,
          errors: result.errors
        }
      });
    }
  } catch (error) {
    console.error('Political scores calculation route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during score calculation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Combined workflow route
router.post('/full-sync', asyncHandler(async (req, res) => {
  try {
    console.log('Starting full sync workflow...');
    const startTime = Date.now();
    
    const { votingRecordsLimit = 10 } = req.body;
    
    const results = {
      politicians: null as any,
      votingRecords: null as any,
      scores: null as any,
      errors: [] as string[]
    };
    
    // Step 1: Sync politicians (ensure we have congress_id)
    console.log('Step 1: Syncing politicians...');
    try {
      results.politicians = await syncService.syncPoliticians();
      if (!results.politicians.success) {
        results.errors.push('Politicians sync failed');
      }
    } catch (error) {
      results.errors.push(`Politicians sync error: ${error}`);
    }
    
    // Step 2: Sync voting records
    console.log('Step 2: Syncing voting records...');
    try {
      results.votingRecords = await votingRecordsService.syncVotingRecords(118, votingRecordsLimit);
      if (!results.votingRecords.success) {
        results.errors.push('Voting records sync failed');
      }
    } catch (error) {
      results.errors.push(`Voting records sync error: ${error}`);
    }
    
    // Step 3: Calculate political scores
    console.log('Step 3: Calculating political scores...');
    try {
      results.scores = await politicalScoringService.calculatePoliticalScores();
      if (!results.scores.success) {
        results.errors.push('Score calculation failed');
      }
    } catch (error) {
      results.errors.push(`Score calculation error: ${error}`);
    }
    
    const duration = Date.now() - startTime;
    const success = results.errors.length === 0;
    
    res.json({
      success,
      message: success 
        ? 'Full sync completed successfully' 
        : `Full sync completed with ${results.errors.length} errors`,
      data: {
        duration: `${duration}ms`,
        politicians: results.politicians,
        votingRecords: results.votingRecords,
        scores: results.scores,
        errors: results.errors
      }
    });
    
  } catch (error) {
    console.error('Full sync route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during full sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Add a status endpoint to check sync capabilities
router.get('/status', asyncHandler(async (_req, res) => {
  const hasApiKey = !!process.env.CONGRESS_API_KEY;
  
  res.json({
    congressApiConfigured: hasApiKey,
    syncAvailable: hasApiKey,
    message: hasApiKey 
      ? 'Sync service is ready' 
      : 'Congress API key not configured'
  });
}));

export default router; 