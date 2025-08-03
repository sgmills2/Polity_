import dotenv from 'dotenv';
import * as syncService from '../services/sync';
import * as votingRecordsService from '../services/votingRecords';
import * as politicalScoringService from '../services/politicalScoring';

// Load environment variables
dotenv.config();

async function syncRealData() {
  console.log('🚀 Starting full Congressional data sync...');
  console.log('This will sync real politicians, voting records, and calculate political scores.');
  
  const startTime = Date.now();
  let hasErrors = false;

  try {
    // Step 1: Sync politicians from Congress API
    console.log('\n📋 Step 1: Syncing politicians from Congress API...');
    const politiciansResult = await syncService.syncPoliticians();
    
    if (politiciansResult.success) {
      console.log(`✅ Synced ${politiciansResult.totalSynced} politicians`);
    } else {
      console.error('❌ Politicians sync failed:', politiciansResult.errors);
      hasErrors = true;
    }

    // Step 2: Sync voting records
    console.log('\n🗳️  Step 2: Syncing voting records (limited to 20 bills for demo)...');
    const votingResult = await votingRecordsService.syncVotingRecords(118, 20);
    
    if (votingResult.success) {
      console.log(`✅ Synced ${votingResult.totalBills} bills with ${votingResult.totalRecords} voting records`);
    } else {
      console.error('❌ Voting records sync failed:', votingResult.errors);
      hasErrors = true;
    }

    // Step 3: Calculate political scores
    console.log('\n📊 Step 3: Calculating political scores based on voting records...');
    const scoresResult = await politicalScoringService.calculatePoliticalScores();
    
    if (scoresResult.success) {
      console.log(`✅ Calculated ${scoresResult.calculatedScores} political scores`);
    } else {
      console.error('❌ Score calculation failed:', scoresResult.errors);
      hasErrors = true;
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    if (hasErrors) {
      console.log(`\n⚠️  Sync completed with errors in ${duration}s`);
      console.log('Check the logs above for details.');
    } else {
      console.log(`\n🎉 Full sync completed successfully in ${duration}s!`);
      console.log('Your database now contains real Congressional data.');
      console.log('You can now use the politician detail pages to see real political scores.');
    }

  } catch (error) {
    console.error('\n💥 Unexpected error during sync:', error);
    process.exit(1);
  }
}

// Run the sync
syncRealData()
  .then(() => {
    console.log('\n✨ Sync script finished. You can now restart your frontend to see real data.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync script failed:', error);
    process.exit(1);
  }); 